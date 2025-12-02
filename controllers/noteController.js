const Lead = require('../models/Lead');

exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    lead.notes.push({
      content,
      createdBy: req.user._id
    });

    await lead.save();
    
    const populatedLead = await Lead.findById(id)
      .populate('notes.createdBy', 'name email');

    res.json({ 
      message: 'Note added successfully', 
      notes: populatedLead.notes 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id, noteId } = req.params;
    const { content } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const note = lead.notes.id(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check if user owns the note or is admin
    if (note.createdBy.toString() !== req.user._id.toString() && 
        !['super_admin', 'sub_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    note.content = content;
    note.updatedAt = Date.now();
    
    await lead.save();
    res.json({ message: 'Note updated successfully', note });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id, noteId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const note = lead.notes.id(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check if user owns the note or is admin
    if (note.createdBy.toString() !== req.user._id.toString() && 
        !['super_admin', 'sub_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    lead.notes.pull(noteId);
    await lead.save();
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLeadNotes = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id)
      .populate('notes.createdBy', 'name email')
      .select('notes');

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead.notes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};