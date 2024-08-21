const express = require('express');
const Form = require('../models/Form');
const { Parser } = require('json2csv');

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
    ];

    // Create a JSON2CSV parser instance
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formData);

    // Set the proper headers for a CSV download
    res.header('Content-Type', 'text/csv');
    res.attachment('formData.csv');
    res.send(csv);
  } catch (err) {
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
