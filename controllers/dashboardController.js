const Lead = require('../models/Lead');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

exports.getDashboardStats = async (req, res) => {
  try {
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'support_agent') {
      filter.assignedTo = req.user._id;
    }

    // Lead status distribution
    const statusDistribution = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Agent performance (only for admins)
    let agentPerformance = [];
    if (req.user.role !== 'support_agent') {
      agentPerformance = await Lead.aggregate([
        { $match: { assignedTo: { $exists: true } } },
        { $group: { 
          _id: '$assignedTo', 
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }
        }},
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }},
        { $unwind: '$agent' },
        { $project: {
          agent: '$agent.name',
          total: 1,
          won: 1,
          conversionRate: { $multiply: [{ $divide: ['$won', '$total'] }, 100] }
        }}
      ]);
    }

    // Recent activities
    const recentActivities = await ActivityLog.find({})
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .limit(10);

    // Monthly lead growth
    const monthlyGrowth = await Lead.aggregate([
      { $match: filter },
      { $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      statusDistribution,
      agentPerformance,
      recentActivities,
      monthlyGrowth,
      totalLeads: await Lead.countDocuments(filter)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};