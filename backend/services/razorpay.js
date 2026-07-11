const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createPayment = async (amount) => {
  const payment = await razorpay.payment.create({
    amount: amount * 100,
    currency: 'INR',
    receipt: 'receipt#1',
  });
  return payment;
};

module.exports = { createPayment };
