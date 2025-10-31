const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RXkReSt37EEzAu',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'NOfbZgZX3gAyNrgfxuxuQSik'
});

// Subscription plan IDs (create these in Razorpay dashboard)
// Go to: https://dashboard.razorpay.com/app/subscriptions/plans
const SUBSCRIPTION_PLANS = {
  // Student plans
  student_monthly: process.env.ROZORPAY_PLAN_STUDENT_MONTHLY || 'plan_Ra7vs0nuA5ulHl',
  student_yearly: process.env.ROZORPAY_PLAN_STUDENT_YEARLY || 'plan_Ra7yS90igGECvz',

  // Premium plans
  premium_monthly: process.env.RAZORPAY_PLAN_PREMIUM_MONTHLY || 'plan_RXzlMYb1U0bcte',
  premium_yearly: process.env.RAZORPAY_PLAN_PREMIUM_YEARLY || 'plan_RXzkwGXAkB0qSv',

  // Pro plans
  pro_monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY || 'plan_RXzmmfBYzl8plO',
  pro_yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY || 'plan_RXze6DQ0pIFfD3'
};

// Plan details for reference
const PLAN_DETAILS = {
  student_monthly: {
    name: 'Student Monthly',
    amount: 39900, // in paise (₹399.00)
    currency: 'INR',
    interval: 1,
    period: 'monthly',
    tier: 'student'
  },
  student_yearly: {
    name: 'Student Yearly',
    amount: 399900, // in paise (₹3,999.00)
    currency: 'INR',
    interval: 12,
    period: 'yearly',
    tier: 'student',
    discount: '2 months free'
  },
  premium_monthly: {
    name: 'Premium Monthly',
    amount: 79900, // in paise (₹799.00)
    currency: 'INR',
    interval: 1,
    period: 'monthly',
    tier: 'premium'
  },
  premium_yearly: {
    name: 'Premium Yearly',
    amount: 799000, // in paise (₹7,990.00)
    currency: 'INR',
    interval: 12,
    period: 'yearly',
    tier: 'premium',
    discount: '2 months free'
  },
  pro_monthly: {
    name: 'Pro Monthly',
    amount: 199900, // in paise (₹1,999.00)
    currency: 'INR',
    interval: 1,
    period: 'monthly',
    tier: 'pro'
  },
  pro_yearly: {
    name: 'Pro Yearly',
    amount: 1999000, // in paise (₹19,990.00)
    currency: 'INR',
    interval: 12,
    period: 'yearly',
    tier: 'pro',
    discount: '2 months free'
  }
};

/**
 * Get plan details by plan key
 */
function getPlanDetails(planKey) {
  return PLAN_DETAILS[planKey] || null;
}

/**
 * Get tier from plan key
 */
function getTierFromPlan(planKey) {
  const details = PLAN_DETAILS[planKey];
  return details ? details.tier : 'free';
}

module.exports = {
  razorpay,
  SUBSCRIPTION_PLANS,
  PLAN_DETAILS,
  getPlanDetails,
  getTierFromPlan
};
