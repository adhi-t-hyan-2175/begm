// MSG91 OTP Integration Service
const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

const isConfigured = () => {
  return AUTH_KEY && AUTH_KEY !== 'YOUR_MSG91_AUTH_KEY' && TEMPLATE_ID && TEMPLATE_ID !== 'YOUR_MSG91_TEMPLATE_ID';
};

/**
 * Sends an OTP via MSG91
 * @param {string} phone - Phone number with country code (e.g. 919876543210)
 */
const sendOTP = async (phone) => {
  // Mock mode for local testing if MSG91 is not configured
  if (!isConfigured()) {
    console.log(`[MSG91-MOCK] Sending OTP to ${phone}. Use 123456 to verify.`);
    return { type: 'success', message: 'Mock OTP sent successfully.' };
  }

  const url = `https://control.msg91.com/api/v5/otp?template_id=${TEMPLATE_ID}&mobile=${phone}`;
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authkey: AUTH_KEY
    },
    body: JSON.stringify({})
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.type === 'error') {
      throw new Error(data.message || 'Failed to send OTP');
    }
    return data;
  } catch (err) {
    console.error('[MSG91 Send Error]', err);
    throw new Error('OTP delivery failed. Try again later.');
  }
};

/**
 * Verifies an OTP via MSG91
 * @param {string} phone - Phone number with country code
 * @param {string} otp - The OTP entered by user
 */
const verifyOTP = async (phone, otp) => {
  // Mock mode
  if (!isConfigured()) {
    console.log(`[MSG91-MOCK] Verifying OTP for ${phone}: ${otp}`);
    if (otp === '123456') return true;
    throw new Error('Invalid OTP');
  }

  const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${phone}`;
  const options = {
    method: 'GET',
    headers: {
      authkey: AUTH_KEY
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.type === 'error') {
      throw new Error(data.message || 'Invalid OTP');
    }
    return true; // success
  } catch (err) {
    console.error('[MSG91 Verify Error]', err);
    throw new Error(err.message || 'Invalid OTP');
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};
