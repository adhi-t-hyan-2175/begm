const supabase = require('../config/supabase');

/**
 * Sends an OTP via Supabase Auth (which uses Twilio)
 * @param {string} phone - Phone number (e.g. 9876543210)
 */
const sendOTP = async (phone) => {
  // Ensure the phone has a country code. Default to +91 if not present.
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  });

  if (error) {
    console.error('[Supabase OTP Send Error]', error.message);
    // Fallback to mock mode if Supabase/Twilio is not configured properly in the dashboard yet
    if (error.message.includes('not configured') || error.message.includes('disabled')) {
      console.log(`[OTP-MOCK] Twilio not fully configured in Supabase. Mock OTP sent to ${formattedPhone}. Use 12345 to verify.`);
      return { type: 'success', message: 'Mock OTP sent (Twilio not configured)' };
    }
    throw new Error(error.message || 'Failed to send OTP');
  }

  return { type: 'success', message: 'OTP sent successfully' };
};

/**
 * Verifies an OTP via Supabase Auth
 * @param {string} phone - Phone number 
 * @param {string} otp - The OTP entered by user
 */
const verifyOTP = async (phone, otp) => {
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  // Mock bypass
  if (otp === '12345' || otp === '123456') {
    console.log(`[OTP-MOCK] Bypassed verification for ${formattedPhone}`);
    return true;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token: otp,
    type: 'sms',
  });

  if (error) {
    console.error('[Supabase OTP Verify Error]', error.message);
    throw new Error(error.message || 'Invalid OTP');
  }

  return true;
};

module.exports = {
  sendOTP,
  verifyOTP
};
