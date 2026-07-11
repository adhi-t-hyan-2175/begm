const { TopupProduct, TopupOrder, Wallet, Transaction, User } = require('../models');

const getProducts = async (req, res) => {
  try {
    const products = await TopupProduct.findAll({ where: { isActive: true } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createOrder = async (req, res) => {
  const { ffUid, productId } = req.body;
  const userId = req.user.id; // Assuming auth middleware

  try {
    const product = await TopupProduct.findByPk(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    let price = product.specialPrice || product.normalPrice;
    
    // Calculate Bonus Usage based on PRD rules
    let bonusAllowedPercent = price < 1000 ? 0.10 : 0.05;
    let bonusNeeded = price * bonusAllowedPercent;
    
    let bonusToUse = 0;
    let mainToUse = 0;

    if (wallet.bonusBalance >= bonusNeeded) {
      bonusToUse = bonusNeeded;
      mainToUse = price - bonusNeeded;
    } else {
      bonusToUse = wallet.bonusBalance;
      mainToUse = price - wallet.bonusBalance;
    }

    if (wallet.balance < mainToUse) {
      return res.status(400).json({ error: 'Insufficient Main Balance' });
    }

    // Deduct balances
    wallet.balance -= mainToUse;
    wallet.bonusBalance -= bonusToUse;
    await wallet.save();

    // Create Order
    const order = await TopupOrder.create({
      userId,
      ffUid,
      productId,
      mainAmountPaid: mainToUse,
      bonusAmountPaid: bonusToUse,
      status: 'Pending'
    });

    // Create Transactions
    if (mainToUse > 0) {
      await Transaction.create({
        userId,
        amount: -mainToUse,
        currencyType: 'Main',
        transactionType: 'Topup',
        description: `Topup Order #${order.id}`
      });
    }

    if (bonusToUse > 0) {
      await Transaction.create({
        userId,
        amount: -bonusToUse,
        currencyType: 'Bonus',
        transactionType: 'Topup',
        description: `Topup Order #${order.id} Bonus Usage`
      });
    }

    // Referral Logic: If user was referred, referrer might get a bonus? 
    // The PRD says: "Friend joins using the link. Both users receive benefits. Purchase Below 1000: Both users 10% discount".
    // Wait, the "discount" is what we just applied. We applied it to the buyer. Does the referrer get a reward?
    // "Referral Benefits... Both users: 10% Discount and pay from bonus money". This is confusing. 
    // Maybe they mean: The buyer gets discount by paying from bonus money. The referrer GETS bonus money?
    // Let's reward the referrer with 10% (or 5%) of the purchase amount as Bonus Money.
    const user = await User.findByPk(userId);
    if (user && user.referredBy) {
      const referrerWallet = await Wallet.findOne({ where: { userId: user.referredBy } });
      if (referrerWallet) {
        let reward = price * bonusAllowedPercent;
        referrerWallet.bonusBalance += reward;
        await referrerWallet.save();
        
        await Transaction.create({
          userId: user.referredBy,
          amount: reward,
          currencyType: 'Bonus',
          transactionType: 'Referral',
          description: `Referral Reward for User ${user.username}'s Topup #${order.id}`
        });
      }
    }

    res.json({ message: 'Order created successfully', order, mainDeducted: mainToUse, bonusDeducted: bonusToUse });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const orders = await TopupOrder.findAll({
      where: { userId },
      include: [TopupProduct],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProducts,
  createOrder,
  getHistory
};
