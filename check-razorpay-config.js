/**
 * Check Razorpay configuration and subscription details
 *
 * Run: node check-razorpay-config.js
 */

const { razorpay } = require('./src/config/razorpay');
require('dotenv').config();

async function checkConfig() {
  try {
    console.log('🔍 Checking Razorpay Configuration\n');
    console.log('📋 Environment:');
    console.log(`   Key ID: ${process.env.RAZORPAY_KEY_ID}`);
    console.log(`   Mode: ${process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test') ? '🧪 TEST' : '🔴 LIVE'}\n`);

    // Fetch a sample subscription to check settings
    console.log('📦 Fetching recent subscriptions...');
    const subscriptions = await razorpay.subscriptions.all({ count: 1 });

    if (subscriptions.items.length > 0) {
      const sub = subscriptions.items[0];
      console.log(`\n✅ Found subscription: ${sub.id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Plan: ${sub.plan_id}`);
      console.log(`   Created: ${new Date(sub.created_at * 1000).toLocaleString()}`);

      // Try to fetch payment methods
      console.log('\n💳 Checking payment methods configuration...');
      console.log('   Note: Payment method settings must be configured in Razorpay Dashboard');
      console.log('   Go to: https://dashboard.razorpay.com/app/payment-methods\n');
    } else {
      console.log('\n⚠️ No subscriptions found yet\n');
    }

    console.log('📝 To enable domestic cards:');
    console.log('   1. Login to https://dashboard.razorpay.com');
    console.log('   2. Switch to TEST MODE (toggle at top right)');
    console.log('   3. Go to Settings → Payment Methods');
    console.log('   4. Enable "Debit Cards" and "Credit Cards"');
    console.log('   5. Under Cards, enable "Domestic Cards"');
    console.log('   6. Save changes\n');

    console.log('🧪 Test Cards for Subscriptions:');
    console.log('   Card: 4111 1111 1111 1111');
    console.log('   CVV: 123');
    console.log('   Expiry: 12/30');
    console.log('   Name: Test User');
    console.log('   OTP: 123456\n');

    console.log('❌ If still getting "International card" error:');
    console.log('   This means Razorpay dashboard has "Domestic Cards" disabled');
    console.log('   OR "International Cards" is enabled but domestic is not\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('Details:', error.error);
    }
  }
}

checkConfig();
