const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Dataset = require("../models/DataSet");
const mongoose = require("mongoose");

router.get('/get-data/:userId/entries', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate('shownDatasets');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const entries = user.shownDatasets;
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
