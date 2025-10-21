const vertexAI = require('./vertexAI');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

class MentorService {
  /**
   * Generate a personalized system prompt based on user context
   */
  generateSystemPrompt(mentorPersona, userContext, language = 'English') {
    const { user, conversation, recentProgress, resumeAnalysis } = userContext;

    let systemPrompt = `You are ${mentorPersona.name}, a ${mentorPersona.specialty} mentor with a ${mentorPersona.personality} personality.

Your role is to provide personalized career guidance in ${language}.

## User Profile:
- Name: ${user.name}
- Career Goal: ${user.profile?.careerGoal || 'Not specified'}
- Current Skills: ${user.skills?.map(s => `${s.name} (${s.level})`).join(', ') || 'None listed'}
- Interests: ${user.profile?.interests?.join(', ') || 'Not specified'}
- Education: ${user.profile?.education || 'Not specified'}

## Context:
`;

    if (resumeAnalysis) {
      systemPrompt += `\n## Resume Analysis Summary:\n`;
      systemPrompt += `- ATS Score: ${resumeAnalysis.atsScore}/100 (analyzed on ${new Date(resumeAnalysis.date).toLocaleDateString()})\n`;

      if (resumeAnalysis.scores) {
        systemPrompt += `- Score Breakdown: Keywords: ${resumeAnalysis.scores.keywords}/100, Formatting: ${resumeAnalysis.scores.formatting}/100, Experience: ${resumeAnalysis.scores.experience}/100, Skills: ${resumeAnalysis.scores.skills}/100\n`;
      }

      if (resumeAnalysis.strengths && resumeAnalysis.strengths.length > 0) {
        systemPrompt += `- Strengths: ${resumeAnalysis.strengths.slice(0, 5).join(' | ')}\n`;
      }

      if (resumeAnalysis.weaknesses && resumeAnalysis.weaknesses.length > 0) {
        systemPrompt += `- Improvement Areas: ${resumeAnalysis.weaknesses.slice(0, 5).join(' | ')}\n`;
      }

      if (resumeAnalysis.keywordAnalysis) {
        if (resumeAnalysis.keywordAnalysis.found && resumeAnalysis.keywordAnalysis.found.length > 0) {
          systemPrompt += `- Keywords Present: ${resumeAnalysis.keywordAnalysis.found.slice(0, 15).join(', ')}\n`;
        }
        if (resumeAnalysis.keywordAnalysis.missing && resumeAnalysis.keywordAnalysis.missing.length > 0) {
          systemPrompt += `- Keywords Missing: ${resumeAnalysis.keywordAnalysis.missing.slice(0, 8).join(', ')}\n`;
        }
      }

      // Include actual resume content for accurate responses
      if (resumeAnalysis.resumeText) {
        systemPrompt += `\n## User's Actual Resume Text:\n`;
        systemPrompt += `(First 4000 characters of the resume content below. Use ONLY this information when discussing the user's resume.)\n\n`;
        systemPrompt += `${resumeAnalysis.resumeText}\n`;
        systemPrompt += `\n(End of resume content)\n`;
      }
    }

    if (recentProgress && recentProgress.length > 0) {
      systemPrompt += `- Recent Activities: ${recentProgress.map(p => p.action).join(', ')}\n`;
    }

    systemPrompt += `
## Your Responsibilities:
1. Provide actionable, personalized career advice based on the user's profile
2. Help with skill development, job search strategies, and career planning
3. Be encouraging, professional, and supportive
4. Use examples relevant to the Indian job market when applicable
5. Suggest specific learning resources, skills to develop, or actions to take
6. Reference the user's skills and goals in your responses
7. Keep responses concise (2-4 paragraphs) unless the user asks for detailed information

## CRITICAL RULES - PREVENT HALLUCINATION:
- ONLY use information that is explicitly provided in the "User Profile", "User's Actual Resume Text", or "Resume Analysis Summary" sections above
- When discussing the user's resume, ONLY reference information from the "User's Actual Resume Text" section
- DO NOT invent, assume, or fabricate ANY details including: CGPA, grades, project dates, company names, job titles, skills, certifications, or achievements
- If specific information is not present in the resume text (e.g., CGPA, specific dates, company details), do NOT mention it or make assumptions
- If you cannot find specific information the user asks about, clearly state "I don't see that information in your resume" rather than guessing
- When citing resume details (projects, experience, skills), quote or paraphrase directly from the "User's Actual Resume Text" section
- Be factual and grounded in the actual resume content provided

## Specialization (${mentorPersona.specialty}):
${this.getSpecialtyGuidance(mentorPersona.specialty)}

Remember: You're a ${mentorPersona.personality} mentor. Maintain this personality in your responses while being helpful and professional.`;

    return systemPrompt;
  }

  /**
   * Get specialty-specific guidance
   */
  getSpecialtyGuidance(specialty) {
    const specialties = {
      'Career Planning': `Focus on helping users make strategic career decisions, set long-term goals, and create actionable career roadmaps. Consider market trends, growth opportunities, and the user's strengths.`,

      'Technology Careers': `Specialize in software engineering, data science, AI/ML, and tech industry careers. Provide guidance on technical skills, frameworks, certifications, and staying current with technology trends.`,

      'Skill Development': `Focus on identifying skill gaps, creating learning paths, recommending resources (courses, books, projects), and tracking skill development progress. Be specific about timelines and milestones.`,

      'Interview Preparation': `Help users prepare for interviews with mock questions, communication tips, behavioral interview strategies, and technical interview preparation. Provide constructive feedback on their responses.`
    };

    return specialties[specialty] || 'Provide general career guidance and support.';
  }

  /**
   * Build conversation history for context
   */
  buildConversationHistory(messages, limit = 10) {
    const recentMessages = messages.slice(-limit);

    return recentMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  /**
   * Generate smart suggestions based on context
   */
  generateSuggestions(userMessage, userContext) {
    const { user } = userContext;
    const messageLower = userMessage.toLowerCase();

    // Context-aware suggestions
    const suggestions = [];

    if (messageLower.includes('skill') || messageLower.includes('learn')) {
      suggestions.push('What skills should I prioritize for my career goal?');
      suggestions.push('Create a 3-month learning roadmap for me');
    }

    if (messageLower.includes('job') || messageLower.includes('career')) {
      suggestions.push('What are the best career paths for my skills?');
      suggestions.push('Help me improve my job search strategy');
    }

    if (messageLower.includes('interview')) {
      suggestions.push('Give me common interview questions for my field');
      suggestions.push('How can I improve my interview performance?');
    }

    if (messageLower.includes('resume') || messageLower.includes('cv')) {
      suggestions.push('How can I improve my resume?');
      suggestions.push('What keywords should I add to my resume?');
    }

    // Default suggestions if none matched
    if (suggestions.length === 0) {
      suggestions.push('Analyze my skill gaps');
      suggestions.push('Recommend learning resources');
      suggestions.push('Create a career roadmap');
      suggestions.push('Prepare me for interviews');
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Extract intent and tags from user message
   */
  extractIntent(userMessage) {
    const messageLower = userMessage.toLowerCase();
    const tags = [];

    // Extract tags based on keywords
    if (messageLower.match(/skill|learn|course|training|study/)) tags.push('skill-development');
    if (messageLower.match(/job|position|role|career|opportunity/)) tags.push('job-search');
    if (messageLower.match(/interview|prepare|practice/)) tags.push('interview-prep');
    if (messageLower.match(/resume|cv|portfolio/)) tags.push('resume');
    if (messageLower.match(/salary|compensation|pay/)) tags.push('salary');
    if (messageLower.match(/roadmap|plan|path|goal/)) tags.push('career-planning');

    return {
      tags,
      intent: tags[0] || 'general'
    };
  }

  /**
   * Generate AI mentor response with full context
   */
  async generateMentorResponse(userId, userMessage, mentorPersona, language = 'English') {
    try {
      // Fetch user data
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error('User not found');
      }

      // Find or create conversation
      const conversation = await Conversation.findOrCreateConversation(userId, mentorPersona);

      // Get recent user progress
      const recentProgress = user.activityLog?.slice(-5) || [];

      // Fetch latest resume analysis AND extracted text
      const Resume = require('../models/Resume');
      const latestResume = await Resume.findOne({
        userId: user.firebaseUid,
        isActive: true,
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .select('atsAnalysis createdAt extractedText')
      .lean();

      let resumeAnalysis = null;
      if (latestResume && latestResume.atsAnalysis?.overallScore) {
        resumeAnalysis = {
          atsScore: latestResume.atsAnalysis.overallScore,
          date: latestResume.createdAt,
          scores: latestResume.atsAnalysis.scores,
          strengths: latestResume.atsAnalysis.strengths || [],
          weaknesses: latestResume.atsAnalysis.weaknesses || [],
          suggestions: latestResume.atsAnalysis.suggestions || [],
          // Include resume text content (truncated to 4000 chars for better context)
          resumeText: latestResume.extractedText?.substring(0, 4000) || null,
          keywordAnalysis: latestResume.atsAnalysis.keywordAnalysis || null
        };
      }

      // Build user context
      const userContext = {
        user,
        conversation,
        recentProgress,
        resumeAnalysis
      };

      // Update conversation context with latest user data (only defined values)
      const contextUpdate = {
        userSkills: user.skills || [],
        recentActivities: recentProgress || []
      };

      // Only add optional fields if they exist
      if (user.profile?.careerGoal) {
        contextUpdate.careerGoal = user.profile.careerGoal;
      }
      if (user.profile?.interests && user.profile.interests.length > 0) {
        contextUpdate.interests = user.profile.interests;
      }
      if (resumeAnalysis) {
        contextUpdate.lastResumeAnalysis = resumeAnalysis;
      }

      await conversation.updateContext(contextUpdate);

      // Generate system prompt
      const systemPrompt = this.generateSystemPrompt(mentorPersona, userContext, language);

      // Build conversation history
      const conversationHistory = this.buildConversationHistory(conversation.messages);

      // Construct full prompt for Vertex AI
      const fullPrompt = `${systemPrompt}

## Conversation History:
${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : mentorPersona.name}: ${msg.content}`).join('\n\n')}

## Current User Message:
${userMessage}

## Your Response:
Provide a helpful, personalized response based on the user's profile and question. Be specific, actionable, and encouraging.`;

      console.log('🤖 Generating mentor response for user:', user.name);
      console.log('💬 Message:', userMessage);
      console.log('👤 Mentor:', mentorPersona.name);

      // Generate AI response using Vertex AI
      const aiResponse = await vertexAI.generateContent(fullPrompt);

      // Generate smart suggestions
      const suggestions = this.generateSuggestions(userMessage, userContext);

      // Extract intent and tags
      const { tags } = this.extractIntent(userMessage);

      // Save messages to conversation
      await conversation.addMessage('user', userMessage, [], { tags });
      await conversation.addMessage('assistant', aiResponse, suggestions, {
        model: 'gemini-2.5-flash',
        mentor: mentorPersona.name
      });

      // Update user activity log
      user.activityLog = user.activityLog || [];
      user.activityLog.push({
        action: 'ai_mentor_chat',
        details: {
          mentor: mentorPersona.name,
          topic: tags[0] || 'general'
        },
        timestamp: new Date()
      });

      if (user.activityLog.length > 100) {
        user.activityLog = user.activityLog.slice(-100);
      }

      await User.findByIdAndUpdate(userId, { activityLog: user.activityLog });

      return {
        response: aiResponse,
        suggestions,
        conversationId: conversation._id,
        messageCount: conversation.messages.length
      };

    } catch (error) {
      console.error('❌ Error generating mentor response:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a user and mentor
   */
  async getConversationHistory(userId, mentorPersonaId) {
    try {
      const conversation = await Conversation.findOne({
        userId,
        'mentorPersona.id': mentorPersonaId,
        isActive: true
      }).lean();

      if (!conversation) {
        return {
          messages: [],
          context: {}
        };
      }

      return {
        messages: conversation.messages,
        context: conversation.context,
        conversationId: conversation._id
      };
    } catch (error) {
      console.error('❌ Error fetching conversation history:', error);
      throw error;
    }
  }

  /**
   * Get all active conversations for a user
   */
  async getUserConversations(userId) {
    try {
      const conversations = await Conversation.findActiveByUser(userId);

      return conversations.map(conv => ({
        id: conv._id,
        mentor: conv.mentorPersona,
        lastMessage: conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1].content
          : 'No messages yet',
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messages.length,
        tags: conv.tags
      }));
    } catch (error) {
      console.error('❌ Error fetching user conversations:', error);
      throw error;
    }
  }

  /**
   * Analyze user progress and generate personalized recommendations
   */
  async generateProgressAnalysis(userId) {
    try {
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error('User not found');
      }

      const conversations = await Conversation.find({ userId, isActive: true });

      // Analyze conversation topics
      const topicFrequency = {};
      conversations.forEach(conv => {
        conv.tags?.forEach(tag => {
          topicFrequency[tag] = (topicFrequency[tag] || 0) + 1;
        });
      });

      // Build analysis prompt
      const analysisPrompt = `Analyze this user's career development progress and provide personalized recommendations:

User Profile:
- Name: ${user.name}
- Skills: ${user.skills?.map(s => `${s.name} (${s.level})`).join(', ') || 'None'}
- Career Goal: ${user.profile?.careerGoal || 'Not specified'}
- Interests: ${user.profile?.interests?.join(', ') || 'Not specified'}

Activity Summary:
- Total mentor conversations: ${conversations.length}
- Main topics discussed: ${Object.keys(topicFrequency).join(', ') || 'None yet'}
- Recent activities: ${user.activityLog?.slice(-5).map(a => a.action).join(', ') || 'None'}

Provide:
1. Progress assessment (what they've been working on)
2. Skill development recommendations
3. Next steps in their career journey
4. Suggested focus areas for the next month

Keep it concise, actionable, and encouraging.`;

      const analysis = await vertexAI.generateContent(analysisPrompt);

      return {
        analysis,
        stats: {
          totalConversations: conversations.length,
          topTopics: Object.entries(topicFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, count })),
          skillCount: user.skills?.length || 0,
          hasCareerGoal: !!user.profile?.careerGoal
        }
      };
    } catch (error) {
      console.error('❌ Error generating progress analysis:', error);
      throw error;
    }
  }
}

module.exports = new MentorService();
