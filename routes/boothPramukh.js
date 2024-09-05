const express = require('express');
const Form = require('../models/BoothPramukh');
const { Parser } = require('json2csv');
const User = require("../models/User");
const Dataset = require('../models/DataSet');

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

router.get('/phone-working-stats', async (req, res) => {
  try {
    const stats = await Form.aggregate([
      {
        $project: {
          isYes: {
            $cond: [
              {
                $and: [
                  { $ne: ['$callingStatus', ''] },  // If callingStatus is present, use it
                  { $eq: ['$callingStatus', 'Answered'] }
                ]
              },
              1,
              {
                $cond: [
                  { $eq: ['$phoneWorking', 'Yes'] },  // Else fallback to phoneWorking
                  1,
                  0
                ]
              }
            ]
          },
          isNo: {
            $cond: [
              {
                $and: [
                  { $ne: ['$callingStatus', ''] },  // If callingStatus is present, use it
                  { $in: ['$callingStatus', ['Not answered', 'Not interested', 'Invalid number', 'Switch off']] }
                ]
              },
              1,
              {
                $cond: [
                  { $eq: ['$phoneWorking', 'No'] },  // Else fallback to phoneWorking
                  1,
                  0
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalYes: { $sum: '$isYes' },
          totalNo: { $sum: '$isNo' },
          overallTotal: { $sum: { $add: ['$isYes', '$isNo'] } }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : { totalYes: 0, totalNo: 0, overallTotal: 0 };

    res.json(result);
  } catch (error) {
    console.error('Error fetching phone working stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




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
    const userIds = [
      ...new Set([
        ...todayForms.map(t => t._id?.toString() || ''), 
        ...overallForms.map(o => o._id?.toString() || '')
      ])
    ].filter(id => id); // Filter out empty strings

    const users = await User.find({ _id: { $in: userIds } }).select('userName email _id');

    // Map user details for fast lookup
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = { userName: user.userName, email: user.email };
      return acc;
    }, {});

    // Combine the results with userName and email
    const stats = overallForms.map(overall => {
      if (!overall._id) return null; // Skip if _id is null

      const userIdStr = overall._id.toString();
      const today = todayForms.find(t => t._id?.toString() === userIdStr);

      return {
        userId: overall._id,
        userName: userMap[userIdStr] ? userMap[userIdStr].userName : 'Unknown',
        email: userMap[userIdStr] ? userMap[userIdStr].email : 'Unknown',
        todayCount: today ? today.todayCount : 0,
        overallCount: overall.overallCount
      };
    }).filter(stat => stat !== null); // Filter out null values

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
      'callingStatus',
      'phoneNumber',
      'phoneMappedCorrectly',
      'correctName',
      'gender',
      'assembly',
      'boothPramukh',
      'boothNumber',
      'boothCommittee',
      'committeeMembers',
      'preparationRating',
      'oppositionParty',
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

router.get('/export-csv-dataset', async (req, res) => {
  try {
    // Fetch all form data from the database
    const formData = await Dataset.find({});

    // Define the fields you want in the CSV
    const fields = [
      'district',
      'pc',
      'acName',
      'acNumber',
      'taluka',
      'boothNumber',
      'boothName',
      'boothPramukhName',
      'boothPramukhContactNumber',
      'boothPramukhGender',
      'shivdootName',
      'shivdootContactNumber',
      'shivdootGender',
      'zone',
      'shownTo',
      'isUsed',
      'formFilled',
      'callingStatus',
      'createdAt'
    ];

    // Create a JSON2CSV parser instance
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formData);

    // Set the proper headers for a CSV download
    res.header('Content-Type', 'text/csv');
    res.attachment('callingDataset.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting data to CSV:', err);
    res.status(500).json({ error: 'Failed to export data to CSV' });
  }
});


router.get('/associated-with-shivsena', async (req, res) => {
  try {
    const associatedCount = await Form.countDocuments({ associatedWithShivSena: 'Yes' });
    res.json({ associatedCount });
  } catch (error) {
    console.error('Error fetching associated with Shiv Sena count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/total-shivdoots', async (req, res) => {
  try {
    const totalShivdoots = await Form.countDocuments({ callingStatus: 'Answered', associatedWithShivSena: 'Yes' });
    res.json({ totalShivdoots });
  } catch (error) {
    console.error('Error fetching total Shivdoots:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/gender-distribution', async (req, res) => {
  try {
    const maleCount = await Form.countDocuments({ gender: 'Male' });
    const femaleCount = await Form.countDocuments({ gender: 'Female' });

    const totalShivdoots = maleCount + femaleCount;

    res.json({
      maleCount,
      femaleCount,
      totalShivdoots,
    });
  } catch (error) {
    console.error('Error fetching gender distribution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/zone-distribution/:zone', async (req, res) => {
  const { zone } = req.query; // Accept zone as a query parameter
  const matchStage = zone ? { zone } : {}; // Match zone if provided

  try {
    const zoneDistribution = await Dataset.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'forms',
          localField: 'shivdootContactNumber',
          foreignField: 'shivdootPhoneNumber',
          as: 'formDetails',
        },
      },
      { $unwind: '$formDetails' },
      {
        $group: {
          _id: '$zone',
          totalEntries: { $sum: 1 },
          shivdootsCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$formDetails.associatedWithShivSena', 'Yes'] }, { $eq: ['$formDetails.callingStatus', 'Answered'] }] },
                1,
                0,
              ],
            },
          },
          otherEntriesCount: {
            $sum: {
              $cond: [
                { $or: [{ $ne: ['$formDetails.associatedWithShivSena', 'Yes'] }, { $ne: ['$formDetails.callingStatus', 'Answered'] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          zone: '$_id',
          totalEntries: 1,
          shivdootsCount: 1,
          otherEntriesCount: 1,
        },
      },
      { $sort: { zone: 1 } },
    ]);

    res.json(zoneDistribution);
  } catch (error) {
    console.error('Error fetching zone distribution:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
