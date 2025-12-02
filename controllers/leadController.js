const Lead = require('../models/Lead');
const User = require('../models/User');
const xlsx = require('xlsx');
const { validationResult } = require('express-validator');

exports.createLead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({ message: 'Lead created successfully', lead });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const {
      status,
      tags,
      startDate,
      endDate,
      assignedTo,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    // Role-based filtering
    if (req.user.role === 'support_agent') {
      filter.assignedTo = req.user._id;
    }

    if (status) filter.status = status;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (assignedTo) filter.assignedTo = assignedTo;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(filter);

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

exports.getLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};


exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if lead exists and user has permission
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Support agents can only update their assigned leads
    if (req.user.role === 'support_agent' && 
        lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true }
    ).populate('assignedTo', 'name email');

    res.json({ message: 'Lead updated successfully', lead: updatedLead });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file required' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const leads = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const leadData = {
          name: data[i].Name || data[i].name,
          email: data[i].Email || data[i].email,
          phone: data[i].Phone || data[i].phone,
          source: data[i].Source || data[i].source || 'website',
          status: data[i].Status || data[i].status || 'new',
          tags: data[i].Tags ? data[i].Tags.split(',').map(tag => tag.trim()) : [],
          createdBy: req.user._id,
          createdAt: new Date()
        };

        const lead = await Lead.create(leadData);
        leads.push(lead);
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    res.json({
      message: 'Import completed',
      imported: leads.length,
      failed: errors.length,
      errors
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.exportLeads = async (req, res) => {
  try {
    const { tags, fields } = req.query;
    const filter = {};

    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    const exportFields = fields ? fields.split(',') : [
      'name', 'email', 'phone', 'source', 'status', 'tags',
      'assignedTo.name', 'createdAt'
    ];

    const data = leads.map(lead => {
      const row = {};
      exportFields.forEach(field => {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          row[field] = lead[parent] ? lead[parent][child] : '';
        } else {
          row[field] = lead[field];
        }
      });
      return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};