const upi = require('upi');
const upiPayment = new upi({
  id: process.env.UPI_ID,
  password: process.env.UPI_PASSWORD,
});

const makeUPIPayment = async (amount, upiId) => {
  const response = await upiPayment.transfer({
    amount: amount,
    to: upiId,
    message: 'Withdrawal',
  });
  return response;
};

module.exports = { makeUPIPayment };
