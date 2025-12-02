const Lead = require('../models/Lead');
// const mongoose = require('mongoose');

exports.getAllTags = async (req, res) => {
  try {
    const tags = await Lead.aggregate([
      { $unwind: '$tags' },
      { $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateLeadTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags, action } = req.body; // action: 'add' or 'remove'

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (action === 'add') {
      const newTags = Array.isArray(tags) ? tags : [tags];
      lead.tags = [...new Set([...lead.tags, ...newTags])];
    } else if (action === 'remove') {
      const tagsToRemove = Array.isArray(tags) ? tags : [tags];
      lead.tags = lead.tags.filter(tag => !tagsToRemove.includes(tag));
    }

    await lead.save();
    res.json({ message: 'Tags updated successfully', lead });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLeadsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const leads = await Lead.find({ tags: tag })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments({ tags: tag });

    res.json({
      leads,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};