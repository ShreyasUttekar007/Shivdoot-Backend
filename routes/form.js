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
