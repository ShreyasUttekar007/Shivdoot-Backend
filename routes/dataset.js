const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Dataset = require("../models/DataSet");
const mongoose = require("mongoose");

async function fetchAndAssignEntries(userId) {
  // Fetch user and their current datasets
  const user = await User.findById(userId).populate('shownDatasets');
  if (!user) {
    throw new Error('User not found');
  }

  // Check if a new day has started
  const lastAssigned = user.lastAssigned;
  const now = new Date();

  const isNewDay = now.getUTCDate() !== lastAssigned.getUTCDate() ||
                   now.getUTCMonth() !== lastAssigned.getUTCMonth() ||
                   now.getUTCFullYear() !== lastAssigned.getUTCFullYear();

  // Check for duplicates in shownDatasets across all users
  const allUsers = await User.find({ _id: { $ne: userId } }).populate('shownDatasets');

  const userDatasetIds = user.shownDatasets.map(entry => entry._id.toString());
  let hasDuplicates = false;

  allUsers.forEach(otherUser => {
    const otherUserDatasetIds = otherUser.shownDatasets.map(entry => entry._id.toString());
    const commonDatasets = otherUserDatasetIds.filter(id => userDatasetIds.includes(id));

    if (commonDatasets.length > 0) {
      hasDuplicates = true;
    }
  });

  // If a new day has started, duplicates exist, or user has no datasets, reassign a new set of datasets
  if (isNewDay || hasDuplicates || user.shownDatasets.length === 0) {
    // Find datasets not assigned to any user currently and with an empty callingStatus
    const availableDatasets = await Dataset.find({
      isUsed: false,
      shownTo: null,
      callingStatus: '' // Only select entries where callingStatus is empty
    }).limit(80);

    if (availableDatasets.length < 80) {
      // If not enough datasets available, include some from those already assigned but not shown to the current user
      const additionalDatasets = await Dataset.find({
        isUsed: false,
        shownTo: { $ne: userId },
        callingStatus: '' // Ensure the additional entries also have an empty callingStatus
      }).limit(80 - availableDatasets.length);

      availableDatasets.push(...additionalDatasets);
    }

    // Clear the user's current datasets
    user.shownDatasets = [];

    // Assign the new unique datasets to the user
    const assignments = availableDatasets.map(async entry => {
      entry.shownTo = userId;
      await entry.save();
    });

    user.shownDatasets = availableDatasets.map(entry => entry._id);
    user.lastAssigned = now; // Update the last assigned time
    await user.save();

    await Promise.all(assignments);
  }

  // Return the (possibly updated) datasets for the user
  return user.shownDatasets;
}


// API route for fetching assigned datasets for a user
router.get('/get-data/:userId/entries', async (req, res) => {
  try {
    const userId = req.params.userId;
    const entries = await fetchAndAssignEntries(userId);
    res.status(200).json({ entries });
  } catch (error) {
    console.error('Error in fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});


// Update calling status of a specific entry
router.put("/update-calling/:entryId/calling-status", async (req, res) => {
  try {
    const { status, formFilled, userId, userName } = req.body; // Expect userId and userName in the request body
    const entryId = req.params.entryId;

    // Check if status is provided
    if (!status) {
      return res.status(400).json({ error: "Calling status is required" });
    }

    // Check if user details are provided
    if (!userId || !userName) {
      return res.status(400).json({ error: "User details are required" });
    }

    // Fetch the entry by ID
    const entry = await Dataset.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // Update the calling status and form filled status
    entry.callingStatus = status;
    if (formFilled !== undefined) {
      entry.formFilled = formFilled;
    }
    entry.isUsed = true; // Mark entry as used once status is updated

    // Save the userId and userName of the person updating the entry
    entry.updatedBy = {
      userId,
      userName,
    };

    // Save the updated entry
    await entry.save();

    res.status(200).json({ message: "Entry updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});


function getTodayRange() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

// API route to get calling status stats
router.get('/calling-status/stats', async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getTodayRange();

    // Aggregate today's calling status counts
    const todayStats = await Dataset.aggregate([
      { 
        $match: { 
          updatedAt: { $gte: startOfDay, $lte: endOfDay } 
        }
      },
      {
        $group: {
          _id: "$callingStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Aggregate total calling status counts
    const totalStats = await Dataset.aggregate([
      {
        $group: {
          _id: "$callingStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Prepare response format
    const response = {
      today: todayStats.reduce((acc, status) => {
        acc[status._id || 'No Status'] = status.count;
        return acc;
      }, {}),
      total: totalStats.reduce((acc, status) => {
        acc[status._id || 'No Status'] = status.count;
        return acc;
      }, {})
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching calling status stats:', error);
    res.status(500).json({ error: 'Failed to fetch calling status stats' });
  }
});





module.exports = router;
