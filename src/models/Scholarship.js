const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: String,
    required: true,
    trim: true
  },
  eligibility: {
    type: String,
    required: true,
    trim: true
  },
  deadline: {
    type: Date,
    required: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['UG', 'PG', 'Research', 'General', 'Women', 'Minority', 'Merit-based', 'Need-based', 'Internship'],
    default: 'General'
  },
  domain: {
    type: String,
    enum: ['Engineering', 'Medical', 'Arts', 'Science', 'Commerce', 'Law', 'General'],
    default: 'General'
  },
  trending: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster searches
scholarshipSchema.index({ category: 1, domain: 1, active: 1 });
scholarshipSchema.index({ deadline: 1, active: 1 });

module.exports = mongoose.model('Scholarship', scholarshipSchema);