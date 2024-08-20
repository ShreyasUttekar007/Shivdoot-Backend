const express = require("express");
const router = express.Router();
const Dataset = require("../models/Dataset");
const User = require("../models/User");
const moment = require("moment");

router.get("/assign-dataset/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find 80 datasets where callingStatus is empty or does not exist
    const newDatasets = await Dataset.find({
      $or: [
        { callingStatus: "" },           // Entries with callingStatus as an empty string
        { callingStatus: { $exists: false } } // Entries with no callingStatus field
      ]
    })
    .limit(80)
    .exec();

    if (newDatasets.length === 0) {
      return res.status(404).json({ message: "No datasets available" });
    }

    // Update the datasets to mark them as shown to the current user
    await Dataset.updateMany(
      { _id: { $in: newDatasets.map((dataset) => dataset._id) } },
      { shownTo: userId }
    );

    // Add the datasets to the user's shownDatasets
    user.shownDatasets = newDatasets.map((dataset) => dataset._id);
    await user.save();

    res.json(newDatasets);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: error.message });
  }
});



router.post("/update-calling-status/:datasetId", async (req, res) => {
  try {
    const datasetId = req.params.datasetId;
    const { callingStatus, formFilled } = req.body;

    // Validate the request body
    if (callingStatus === undefined || formFilled === undefined) {
      return res.status(400).json({ message: "Missing callingStatus or formFilled in request body" });
    }

    // Find and update the dataset entry
    const dataset = await Dataset.findById(datasetId);

    if (!dataset) {
      return res.status(404).json({ message: "Dataset entry not found" });
    }

    dataset.callingStatus = callingStatus;
    dataset.formFilled = formFilled;

    // Save the updated dataset
    await dataset.save();

    res.json({ message: "Calling status updated", dataset });
  } catch (error) {
    console.error("Error updating dataset:", error);
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;
