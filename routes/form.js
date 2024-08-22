const express = require('express');
const Form = require('../models/Form');
const { Parser } = require('json2csv');
const User = require("../models/User");

const router = express.Router();

// Create a new form entry
router.post('/submit', async (req, res, next) => {
  try {
    const formData = new Form(req.body);
    await formData.save();
    res.status(201).json({ message: 'Form data saved!', formData });
  } catch (error) {
    next(error);
  }
});

function getTodayRange() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

// API route to get the count of forms filled today and overall by each user
router.get('/forms/stats', async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getTodayRange();

    // Get the count of forms filled today by each user
    const todayForms = await Form.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        } 
      },
      {
        $group: {
          _id: "$userId",
          todayCount: { $sum: 1 }
        }
      }
    ]);

    // Get the overall count of forms filled by each user
    const overallForms = await Form.aggregate([
      {
        $group: {
          _id: "$userId",
          overallCount: { $sum: 1 }
        }
      }
    ]);

    // Get user details for all userIds
    const userIds = [...new Set([...todayForms.map(t => t._id.toString()), ...overallForms.map(o => o._id.toString())])];
    const users = await User.find({ _id: { $in: userIds } }).select('userName email _id');

    // Map user details for fast lookup
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = { userName: user.userName, email: user.email };
      return acc;
    }, {});

    // Combine the results with userName and email
    const stats = overallForms.map(overall => {
      const today = todayForms.find(t => t._id.toString() === overall._id.toString());
      return {
        userId: overall._id,
        userName: userMap[overall._id.toString()] ? userMap[overall._id.toString()].userName : 'Unknown',
        email: userMap[overall._id.toString()] ? userMap[overall._id.toString()].email : 'Unknown',
        todayCount: today ? today.todayCount : 0,
        overallCount: overall.overallCount
      };
    });

    res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    res.status(500).json({ error: 'Failed to fetch form stats' });
  }
});
// Read all form entries
router.get('/', async (req, res, next) => {
  try {
    const forms = await Form.find();
    res.json(forms);
  } catch (error) {
    next(error);
  }
});


router.get('/export-csv', async (req, res) => {
  try {
    // Fetch all form data from the database
    const formData = await Form.find({});

    // Define the fields you want in the CSV
    const fields = [
      'userId',
      'userName',
      'phoneWorking',
      'shivdootPhoneNumber',
      'phoneMappedCorrectly',
      'correctName',
      'gender',
      'assembly',
      'boothNumber',
      'associatedWithShivSena',
      'associationDetails',
      'memberDuration',
      'awareOfRegistration',
      'createdAt'
    ];

    // Create a JSON2CSV parser instance
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formData);

    // Set the proper headers for a CSV download
    res.header('Content-Type', 'text/csv');
    res.attachment('formData.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting data to CSV:', err);
    res.status(500).json({ error: 'Failed to export data to CSV' });
  }
});


// Read a single form entry by ID
router.get('/:id', async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    res.json(form);
  } catch (error) {
    next(error);
  }
});

// Update a form entry by ID
router.put('/:id', async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    Object.keys(req.body).forEach(key => {
      form[key] = req.body[key];
    });

    await form.save();
    res.status(200).json({ message: 'Form updated successfully', form });
  } catch (error) {
    next(error);
  }
});

// Delete a form entry by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    res.status(204).json({ message: 'Form deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
