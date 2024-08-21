const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Dataset = require('../models/DataSet');

// Helper function to fetch and assign new entries
async function fetchAndAssignEntries(userId) {
  // Fetch user
  const user = await User.findById(userId).populate('shownDatasets');
  if (!user) {
    throw new Error('User not found');
  }

  // Check for existing valid entries (assigned within the last 24 hours)
  const existingEntries = await Dataset.find({
    _id: { $in: user.shownDatasets },
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // within the last 24 hours
  });

  // If the user already has valid entries, return those
  if (existingEntries.length > 0) {
    return existingEntries;
  }

  // Otherwise, find entries that need to be reassigned (24 hours passed and status not updated)
  const reassignedEntries = await Dataset.find({
    shownTo: userId,
    callingStatus: '',
    isUsed: false,
    updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // older than 24 hours
  }).limit(80);

  // Find new entries to assign (excluding reassigned entries)
  const newEntries = await Dataset.find({
    isUsed: false,
    shownTo: { $ne: userId },
    _id: { $nin: reassignedEntries.map(e => e._id) },
  }).limit(80 - reassignedEntries.length);

  // Combine reassigned and new entries
  const entriesToAssign = [...reassignedEntries, ...newEntries];

  // Update entries with the userId
  const assignments = entriesToAssign.map(async entry => {
    entry.shownTo = userId;
    await entry.save();
  });

  // Update user's shownDatasets
  user.shownDatasets = entriesToAssign.map(entry => entry._id);
  await user.save();

  await Promise.all(assignments);

  return entriesToAssign;
}


// Fetch entries assigned to a specific user
router.get('/get-data/:userId/entries', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch and assign entries if necessary
    const entries = await fetchAndAssignEntries(userId);

    res.status(200).json({ entries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Update calling status of a specific entry
router.put('/update-calling/:entryId/calling-status', async (req, res) => {
  try {
    const { status, formFilled } = req.body;
    const entryId = req.params.entryId;

    // Check if status is provided
    if (!status) {
      return res.status(400).json({ error: 'Calling status is required' });
    }

    // Fetch the entry by ID
    const entry = await Dataset.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Update the calling status and form filled status
    entry.callingStatus = status;
    if (formFilled !== undefined) {
      entry.formFilled = formFilled;
    }
    entry.isUsed = true; // Mark entry as used once status is updated

    // Save the updated entry
    await entry.save();

    res.status(200).json({ message: 'Entry updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});


module.exports = router;
