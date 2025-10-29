const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateUser } = require('../middleware/authMiddleware');
const { razorpay, SUBSCRIPTION_PLANS, getPlanDetails, getTierFromPlan } = require('../config/razorpay');
const User = require('../models/User');

/**
 * GET /api/payment/plans
 * Get available subscription plans
 */
router.get('/plans', (req, res) => {
  const { PLAN_DETAILS } = require('../config/razorpay');

  res.json({
    success: true,
    plans: PLAN_DETAILS
  });
});

/**
 * POST /api/payment/create-subscription
 * Create a new subscription
 */
router.post('/create-subscription', authenticateUser, async (req, res) => {
  try {
    const { plan } = req.body; // 'premium_monthly', 'premium_yearly', 'pro_monthly', 'pro_yearly'

    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan',
        message: 'Please select a valid subscription plan'
      });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check for existing active subscription
    const existingSubscriptionId = user.subscription?.subscriptionId;
    if (existingSubscriptionId && user.subscription?.status === 'active') {
      console.log(`⚠️ User ${user.email} already has active subscription: ${existingSubscriptionId}`);

      // Verify if subscription is actually active on Razorpay
      try {
        const existingSub = await razorpay.subscriptions.fetch(existingSubscriptionId);
        if (existingSub.status === 'active' || existingSub.status === 'authenticated') {
          return res.status(400).json({
            success: false,
            error: 'Active subscription exists',
            message: 'You already have an active subscription. Please cancel it before subscribing to a new plan.',
            existingSubscription: {
              id: existingSub.id,
              plan: user.subscription.plan,
              status: existingSub.status,
              validUntil: user.subscription.validUntil
            }
          });
        }
      } catch (subError) {
        // If subscription doesn't exist on Razorpay, continue with new subscription
        console.log(`ℹ️ Existing subscription ${existingSubscriptionId} not found on Razorpay, creating new one`);
      }
    }

    // Create Razorpay customer if doesn't exist
    let customerId = user.subscription?.customerId;

    if (!customerId) {
      console.log(`📝 Creating/fetching Razorpay customer for ${user.email}`);

      // Clean phone number (remove spaces, +, -, max 15 digits)
      let cleanPhone = user.profile?.phone || '';
      cleanPhone = cleanPhone.replace(/[\s\-\+]/g, ''); // Remove spaces, -, +
      cleanPhone = cleanPhone.substring(0, 15); // Max 15 digits

      try {
        // Try to create customer
        const customer = await razorpay.customers.create({
          name: user.name,
          email: user.email,
          contact: cleanPhone || undefined, // Only send if exists
          notes: {
            userId: user._id.toString()
          }
        });
        customerId = customer.id;
        console.log(`✅ Customer created: ${customerId}`);
      } catch (customerError) {
        // If customer already exists, fetch it
        if (customerError.error?.description?.includes('already exists')) {
          console.log(`ℹ️ Customer already exists, fetching existing customer...`);

          // Fetch all customers and find by email
          const customers = await razorpay.customers.all();
          const existingCustomer = customers.items.find(c => c.email === user.email);

          if (existingCustomer) {
            customerId = existingCustomer.id;
            console.log(`✅ Found existing customer: ${customerId}`);
          } else {
            // Fallback: couldn't find customer, throw original error
            throw customerError;
          }
        } else {
          // Different error, re-throw
          throw customerError;
        }
      }
    }

    // Get plan details
    const planDetails = getPlanDetails(plan);
    const planId = SUBSCRIPTION_PLANS[plan];

    console.log(`📋 Creating subscription for ${user.email} - Plan: ${plan}`);

    // Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      total_count: planDetails.interval, // Number of billing cycles
      quantity: 1,
      notes: {
        userId: user._id.toString(),
        email: user.email,
        planKey: plan,
        tier: planDetails.tier
      }
    });

    console.log(`✅ Subscription created: ${subscription.id}`);

    // Save customer ID to user
    user.subscription.customerId = customerId;
    await user.save();

    res.json({
      success: true,
      subscriptionId: subscription.id,
      customerId,
      planId,
      amount: planDetails.amount,
      currency: planDetails.currency,
      status: subscription.status,
      planDetails
    });
  } catch (error) {
    console.error('❌ Subscription creation error:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      description: error.description
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      message: error.message,
      details: error.description || error.error
    });
  }
});

/**
 * POST /api/payment/verify-payment
 * Verify payment and activate subscription
 */
router.post('/verify-payment', authenticateUser, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification data'
      });
    }

    // Verify signature
    const text = razorpay_payment_id + '|' + razorpay_subscription_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'NOfbZgZX3gAyNrgfxuxuQSik')
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.log('❌ Invalid payment signature');
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
        message: 'Payment verification failed'
      });
    }

    console.log('✅ Payment signature verified');

    // Fetch subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);

    // Update user subscription
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const planTier = subscription.notes.tier || 'premium';
    const validUntil = new Date();

    // Add months based on plan
    if (subscription.notes.planKey && subscription.notes.planKey.includes('yearly')) {
      validUntil.setMonth(validUntil.getMonth() + 12);
    } else {
      validUntil.setMonth(validUntil.getMonth() + 1);
    }

    user.subscription = {
      plan: planTier,
      status: 'active',
      subscriptionId: razorpay_subscription_id,
      customerId: subscription.customer_id,
      validUntil,
      startDate: new Date(),
      features: []
    };

    await user.save();

    // Reset usage quota for the new tier
    const UsageQuota = require('../models/UsageQuota');
    const { TIER_LIMITS } = require('../config/tierLimits');
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Delete old quota and create new one with upgraded limits
    await UsageQuota.findOneAndDelete({
      userId: user._id,
      month: currentMonth
    });

    const tierLimits = TIER_LIMITS[planTier];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    const quotaData = {
      userId: user._id,
      month: currentMonth,
      tier: planTier,
      resetDate: nextMonth
    };

    // Set all feature limits for the new tier
    Object.keys(tierLimits).forEach(feature => {
      quotaData[feature] = {
        used: 0, // Reset usage to 0
        limit: tierLimits[feature]
      };
    });

    await UsageQuota.create(quotaData);

    console.log(`🎉 Subscription activated for ${user.email} - Tier: ${planTier}`);
    console.log(`📊 Usage quota reset for new tier: ${planTier}`);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      plan: planTier,
      validUntil,
      subscriptionId: razorpay_subscription_id
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/payment/webhook
 * Handle Razorpay webhooks for automatic subscription updates
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature (if secret is configured)
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.log('❌ Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`📨 Webhook received: ${event}`);

    // Handle different events
    switch (event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCanceled(payload.subscription.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(payload.subscription.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      default:
        console.log(`⚠️ Unhandled webhook event: ${event}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook helper functions
async function handleSubscriptionActivated(subscription) {
  try {
    const userId = subscription.notes.userId;
    const tier = subscription.notes.tier || 'premium';

    await User.findByIdAndUpdate(userId, {
      'subscription.status': 'active',
      'subscription.plan': tier,
      'subscription.subscriptionId': subscription.id
    });

    console.log(`✅ Subscription activated: User ${userId} - Tier: ${tier}`);
  } catch (error) {
    console.error('❌ Error handling subscription activation:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  try {
    const userId = subscription.notes.userId;

    await User.findByIdAndUpdate(userId, {
      'subscription.status': 'canceled',
      'subscription.canceledAt': new Date()
    });

    console.log(`🚫 Subscription canceled: User ${userId}`);
  } catch (error) {
    console.error('❌ Error handling subscription cancellation:', error);
  }
}

async function handleSubscriptionCharged(subscription, payment) {
  try {
    const userId = subscription.notes.userId;
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 1);

    await User.findByIdAndUpdate(userId, {
      'subscription.status': 'active',
      'subscription.validUntil': validUntil
    });

    console.log(`💳 Subscription charged: User ${userId} - Amount: ₹${payment.amount / 100}`);
  } catch (error) {
    console.error('❌ Error handling subscription charge:', error);
  }
}

async function handleSubscriptionCompleted(subscription) {
  try {
    const userId = subscription.notes.userId;

    await User.findByIdAndUpdate(userId, {
      'subscription.status': 'completed',
      'subscription.plan': 'free'
    });

    console.log(`✅ Subscription completed: User ${userId} - Reverted to free`);
  } catch (error) {
    console.error('❌ Error handling subscription completion:', error);
  }
}

async function handlePaymentFailed(payment) {
  try {
    if (!payment.subscription_id) return;

    const subscription = await razorpay.subscriptions.fetch(payment.subscription_id);
    const userId = subscription.notes.userId;

    await User.findByIdAndUpdate(userId, {
      'subscription.status': 'past_due'
    });

    console.log(`⚠️ Payment failed: User ${userId} - Subscription: ${payment.subscription_id}`);
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
  }
}

/**
 * POST /api/payment/cancel-subscription
 * Cancel user's subscription
 */
router.post('/cancel-subscription', authenticateUser, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const subscriptionId = user.subscription?.subscriptionId;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Cancel on Razorpay
    await razorpay.subscriptions.cancel(subscriptionId, {
      cancel_at_cycle_end: 1 // Cancel at end of billing period
    });

    // Update user status
    user.subscription.status = 'canceled';
    user.subscription.canceledAt = new Date();
    await user.save();

    console.log(`🚫 Subscription canceled: ${user.email}`);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      validUntil: user.subscription.validUntil
    });
  } catch (error) {
    console.error('❌ Cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

/**
 * GET /api/payment/subscription-status
 * Get current subscription status
 */
router.get('/subscription-status', authenticateUser, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      subscription: {
        plan: user.subscription?.plan || 'free',
        status: user.subscription?.status || 'active',
        validUntil: user.subscription?.validUntil,
        startDate: user.subscription?.startDate,
        subscriptionId: user.subscription?.subscriptionId,
        isActive: user.subscription?.status === 'active' &&
                  (!user.subscription?.validUntil || new Date() < user.subscription.validUntil)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription status',
      message: error.message
    });
  }
});

module.exports = router;
