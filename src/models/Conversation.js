const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String, // Firebase UID
    required: true,
    index: true
  },
  mentorPersona: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    specialty: { type: String, required: true }
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    suggestions: [{
      type: String
    }],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  context: {
    userSkills: [{
      name: String,
      level: String
    }],
    careerGoal: String,
    interests: [String],
    recentActivities: [{
      action: String,
      timestamp: Date
    }],
    lastResumeAnalysis: {
      atsScore: Number,
      date: Date
    }
  },
  language: {
    type: String,
    default: 'en'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'concerned', 'frustrated'],
    default: 'neutral'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
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

// Indexes for performance
conversationSchema.index({ userId: 1, isActive: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ 'mentorPersona.id': 1 });
conversationSchema.index({ tags: 1 });

// Update lastMessageAt whenever a message is added
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastMessageAt = new Date();
  }
  next();
});

// Methods
conversationSchema.methods.addMessage = function(role, content, suggestions = [], metadata = {}) {
  this.messages.push({
    role,
    content,
    suggestions,
    metadata,
    timestamp: new Date()
  });
  this.lastMessageAt = new Date();
  return this.save();
};

conversationSchema.methods.updateContext = function(contextUpdates) {
  // Only update fields that are actually provided (not undefined)
  Object.keys(contextUpdates).forEach(key => {
    if (contextUpdates[key] !== undefined) {
      this.context[key] = contextUpdates[key];
    }
  });
  this.markModified('context');
  return this.save();
};

conversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

// Static methods
conversationSchema.statics.findActiveByUser = function(userId) {
  return this.find({ userId, isActive: true })
    .sort({ lastMessageAt: -1 })
    .limit(10);
};

conversationSchema.statics.findOrCreateConversation = async function(userId, mentorPersona) {
  let conversation = await this.findOne({
    userId,
    'mentorPersona.id': mentorPersona.id,
    isActive: true
  });

  if (!conversation) {
    conversation = await this.create({
      userId,
      mentorPersona,
      messages: [],
      context: {}
    });
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
