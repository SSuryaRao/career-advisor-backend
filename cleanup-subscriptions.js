/**
 * Script to clean up duplicate/unwanted Razorpay subscriptions
 *
 * Run: node cleanup-subscriptions.js
 */

const { razorpay } = require('./src/config/razorpay');
require('dotenv').config();

async function cleanupSubscriptions() {
  try {
    console.log('🔍 Fetching all subscriptions...\n');

    // Fetch all subscriptions
    const subscriptions = await razorpay.subscriptions.all();

    console.log(`Found ${subscriptions.items.length} subscriptions:\n`);

    // Group by customer email
    const byCustomer = {};

    for (const sub of subscriptions.items) {
      const customerEmail = sub.notes?.email || 'unknown';

      if (!byCustomer[customerEmail]) {
        byCustomer[customerEmail] = [];
      }

      byCustomer[customerEmail].push({
        id: sub.id,
        plan: sub.notes?.planKey || 'unknown',
        status: sub.status,
        createdAt: new Date(sub.created_at * 1000).toLocaleString()
      });
    }

    // Display grouped subscriptions
    for (const [email, subs] of Object.entries(byCustomer)) {
      console.log(`📧 ${email}:`);
      subs.forEach((sub, idx) => {
        console.log(`   ${idx + 1}. ${sub.id}`);
        console.log(`      Plan: ${sub.plan}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Created: ${sub.createdAt}`);
      });
      console.log();
    }

    // Find customers with multiple subscriptions
    const duplicates = Object.entries(byCustomer).filter(([_, subs]) => subs.length > 1);

    if (duplicates.length > 0) {
      console.log('\n⚠️ Customers with multiple subscriptions:');
      duplicates.forEach(([email, subs]) => {
        console.log(`   ${email}: ${subs.length} subscriptions`);
      });

      console.log('\n💡 To cancel a subscription, run:');
      console.log('   node cleanup-subscriptions.js cancel <subscription_id>\n');
    } else {
      console.log('✅ No duplicate subscriptions found\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('Details:', error.error);
    }
  }
}

async function cancelSubscription(subscriptionId) {
  try {
    console.log(`🔍 Fetching subscription: ${subscriptionId}...`);

    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    console.log(`\n📋 Subscription Details:`);
    console.log(`   ID: ${subscription.id}`);
    console.log(`   Plan: ${subscription.notes?.planKey || 'unknown'}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Customer: ${subscription.notes?.email || 'unknown'}`);

    if (subscription.status === 'cancelled') {
      console.log('\n✅ Subscription is already cancelled');
      return;
    }

    if (subscription.status === 'created' || subscription.status === 'authenticated') {
      console.log('\n🚫 Cancelling subscription...');

      const result = await razorpay.subscriptions.cancel(subscriptionId);

      console.log(`✅ Subscription cancelled successfully`);
      console.log(`   New status: ${result.status}`);
    } else {
      console.log(`\n⚠️ Cannot cancel subscription with status: ${subscription.status}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('Details:', error.error);
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const subscriptionId = args[1];

if (command === 'cancel' && subscriptionId) {
  cancelSubscription(subscriptionId);
} else if (command === 'cancel' && !subscriptionId) {
  console.log('❌ Please provide subscription ID');
  console.log('Usage: node cleanup-subscriptions.js cancel <subscription_id>');
} else {
  cleanupSubscriptions();
}
