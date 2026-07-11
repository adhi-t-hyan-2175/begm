const { User, Wallet, Transaction, Task, UserTask, Sequelize } = require('../models');

const getLeaderboards = async (req, res) => {
  try {
    // Highest Recharge (from Transactions type = Deposit)
    const rechargeLeaderboard = await Transaction.findAll({
      attributes: ['userId', [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalRecharge']],
      where: { transactionType: 'Deposit' },
      group: ['userId'],
      order: [[Sequelize.literal('totalRecharge'), 'DESC']],
      limit: 10,
      include: [{ model: User, attributes: ['username', 'vipStatus'] }]
    });

    // Referral King (from User referredBy count)
    const referralLeaderboard = await User.findAll({
      attributes: ['id', 'username', 'vipStatus', [
        Sequelize.literal(`(SELECT COUNT(*) FROM Users AS U WHERE U.referredBy = User.id)`),
        'referralCount'
      ]],
      order: [[Sequelize.literal('referralCount'), 'DESC']],
      limit: 10
    });

    res.json({
      recharge: rechargeLeaderboard,
      referral: referralLeaderboard
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTasks = async (req, res) => {
  const userId = req.user.id;
  try {
    const tasks = await Task.findAll();
    const userTasks = await UserTask.findAll({ where: { userId } });
    
    // Merge status
    const tasksWithStatus = tasks.map(t => {
      const ut = userTasks.find(ut => ut.taskId === t.id);
      return {
        ...t.toJSON(),
        status: ut ? ut.status : 'Pending'
      };
    });
    
    res.json(tasksWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const claimTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.body;
  try {
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    let userTask = await UserTask.findOne({ where: { userId, taskId } });
    if (userTask && userTask.status === 'Completed') {
      return res.status(400).json({ error: 'Task already claimed' });
    }
    
    if (!userTask) {
      userTask = await UserTask.create({ userId, taskId, status: 'Completed', completedAt: new Date() });
    } else {
      userTask.status = 'Completed';
      userTask.completedAt = new Date();
      await userTask.save();
    }
    
    const wallet = await Wallet.findOne({ where: { userId } });
    wallet.bonusBalance += task.rewardAmount;
    await wallet.save();
    
    await Transaction.create({
      userId,
      amount: task.rewardAmount,
      currencyType: 'Bonus',
      transactionType: 'Task',
      description: `Task Completion Reward: ${task.title}`
    });
    
    res.json({ message: 'Task claimed successfully', bonusEarned: task.rewardAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getLeaderboards,
  getTasks,
  claimTask
};
