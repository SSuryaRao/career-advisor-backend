const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  remoteId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  companyLogo: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: 'Remote',
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  salary: {
    min: {
      type: Number,
      default: null
    },
    max: {
      type: Number,
      default: null
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    default: 'mid'
  },
  applicationUrl: {
    type: String,
    required: true
  },
  postedAt: {
    type: Date,
    required: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  remoteLevel: {
    type: String,
    enum: ['fully-remote', 'hybrid', 'office-based'],
    default: 'fully-remote'
  },
  sourceApi: {
    type: String,
    default: 'remoteok',
    enum: ['remoteok', 'manual']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

jobSchema.index({ title: 'text', description: 'text', company: 'text', tags: 'text' });
jobSchema.index({ postedAt: -1 });
jobSchema.index({ company: 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ isActive: 1, postedAt: -1 });

jobSchema.pre('save', function(next) {
  if (this.isModified('tags')) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }
  next();
});

jobSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

jobSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ postedAt: -1 });
};

jobSchema.statics.findByTags = function(tags) {
  return this.find({ 
    tags: { $in: tags.map(tag => tag.toLowerCase()) }, 
    isActive: true 
  }).sort({ postedAt: -1 });
};

module.exports = mongoose.model('Job', jobSchema);