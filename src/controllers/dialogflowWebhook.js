/**
 * Dialogflow CX Webhook Handler
 *
 * This controller handles webhook fulfillment requests from Dialogflow CX.
 * Webhooks allow you to perform backend operations and return dynamic responses
 * based on user context and database queries.
 *
 * Configure webhook URL in Dialogflow CX:
 * https://your-domain.com/api/chatbot/webhook
 */

const User = require('../models/User');
const Resume = require('../models/Resume');
const Recommendation = require('../models/Recommendation');
const Roadmap = require('../models/Roadmap');

class DialogflowWebhookController {
  /**
   * Main webhook handler - routes to specific handlers based on tag
   */
  async handleWebhook(req, res) {
    try {
      const tag = req.body.fulfillmentInfo?.tag;
      const sessionInfo = req.body.sessionInfo;
      const parameters = sessionInfo?.parameters || {};

      console.log('🔔 Webhook triggered:', tag);
      console.log('📋 Parameters:', parameters);

      // Route to appropriate handler based on tag
      switch (tag) {
        case 'get-resume-score':
          return await this.getResumeScore(req, res, parameters);

        case 'get-job-recommendations':
          return await this.getJobRecommendations(req, res, parameters);

        case 'get-learning-roadmap':
          return await this.getLearningRoadmap(req, res, parameters);

        case 'get-user-profile':
          return await this.getUserProfile(req, res, parameters);

        case 'get-progress-summary':
          return await this.getProgressSummary(req, res, parameters);

        case 'validate-skill':
          return await this.validateSkill(req, res, parameters);

        case 'check-interview-status':
          return await this.checkInterviewStatus(req, res, parameters);

        default:
          return this.sendResponse(res, 'I can help you with that. What would you like to know?');
      }
    } catch (error) {
      console.error('❌ Webhook error:', error);
      return this.sendErrorResponse(res, 'Sorry, I encountered an error processing your request.');
    }
  }

  /**
   * Get user's resume score and analysis
   */
  async getResumeScore(req, res, parameters) {
    try {
      const userId = parameters.userId || parameters.user_id;

      if (!userId) {
        return this.sendResponse(res, 'Please log in to view your resume score.');
      }

      const user = await User.findOne({ firebaseUid: userId });
      if (!user || !user.resumeAnalysis) {
        return this.sendResponse(
          res,
          'I don\'t see a resume analysis for you yet. Would you like to upload your resume for analysis?'
        );
      }

      const analysis = user.resumeAnalysis;
      const score = analysis.atsScore || 0;
      const strengths = analysis.strengths?.slice(0, 3) || [];
      const weaknesses = analysis.weaknesses?.slice(0, 3) || [];

      let message = `Your current resume ATS score is ${score}/100. `;

      if (score >= 80) {
        message += 'Excellent! Your resume is well-optimized. ';
      } else if (score >= 60) {
        message += 'Good start, but there\'s room for improvement. ';
      } else {
        message += 'Your resume needs significant improvements. ';
      }

      if (strengths.length > 0) {
        message += `\n\nStrengths: ${strengths.join(', ')}. `;
      }

      if (weaknesses.length > 0) {
        message += `\n\nAreas to improve: ${weaknesses.join(', ')}. `;
      }

      message += '\n\nWould you like detailed recommendations to improve your score?';

      return this.sendResponse(res, message, {
        atsScore: score,
        strengths,
        weaknesses
      });
    } catch (error) {
      console.error('Error getting resume score:', error);
      return this.sendErrorResponse(res, 'I couldn\'t retrieve your resume score. Please try again.');
    }
  }

  /**
   * Get personalized job recommendations
   */
  async getJobRecommendations(req, res, parameters) {
    try {
      const userId = parameters.userId || parameters.user_id;
      const limit = parameters.limit || 5;

      if (!userId) {
        return this.sendResponse(res, 'Please log in to get personalized job recommendations.');
      }

      const user = await User.findOne({ firebaseUid: userId });
      if (!user) {
        return this.sendErrorResponse(res, 'User not found.');
      }

      const recommendations = await Recommendation.find({
        userId: user._id,
        type: 'job'
      })
        .limit(limit)
        .sort({ matchScore: -1 });

      if (recommendations.length === 0) {
        const skills = user.skills?.map(s => s.name).join(', ') || 'your skills';
        return this.sendResponse(
          res,
          `I don't have specific job recommendations yet, but based on ${skills}, I suggest checking our Job Search feature for opportunities that match your profile.`
        );
      }

      let message = `Here are your top ${recommendations.length} job recommendations:\n\n`;

      recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec.title} at ${rec.company || 'Various Companies'}\n`;
        message += `   Match: ${Math.round(rec.matchScore)}%\n`;
        if (rec.location) {
          message += `   Location: ${rec.location}\n`;
        }
        message += '\n';
      });

      message += 'Would you like to explore these opportunities in detail?';

      return this.sendResponse(res, message, {
        recommendations: recommendations.map(r => ({
          id: r._id,
          title: r.title,
          company: r.company,
          matchScore: r.matchScore
        }))
      });
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      return this.sendErrorResponse(res, 'I couldn\'t retrieve job recommendations. Please try again.');
    }
  }

  /**
   * Get user's learning roadmap status
   */
  async getLearningRoadmap(req, res, parameters) {
    try {
      const userId = parameters.userId || parameters.user_id;

      if (!userId) {
        return this.sendResponse(res, 'Please log in to view your learning roadmap.');
      }

      const user = await User.findOne({ firebaseUid: userId });
      if (!user) {
        return this.sendErrorResponse(res, 'User not found.');
      }

      const roadmaps = await Roadmap.find({ userId: user._id, isActive: true });

      if (roadmaps.length === 0) {
        return this.sendResponse(
          res,
          'You don\'t have any active learning roadmaps yet. Would you like me to help you create a personalized learning path based on your career goals?'
        );
      }

      const roadmap = roadmaps[0]; // Get the most recent active roadmap
      const totalMilestones = roadmap.milestones?.length || 0;
      const completedMilestones = roadmap.milestones?.filter(m => m.isCompleted).length || 0;
      const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      let message = `Your current learning roadmap for "${roadmap.title}" is ${progressPercent}% complete.\n\n`;
      message += `Progress: ${completedMilestones} of ${totalMilestones} milestones completed.\n\n`;

      // Get next milestone
      const nextMilestone = roadmap.milestones?.find(m => !m.isCompleted);
      if (nextMilestone) {
        message += `Next milestone: ${nextMilestone.title}\n`;
        if (nextMilestone.description) {
          message += `${nextMilestone.description}\n`;
        }
      }

      message += '\nKeep up the great work! Would you like to see detailed steps for your next milestone?';

      return this.sendResponse(res, message, {
        roadmapId: roadmap._id,
        progress: progressPercent,
        totalMilestones,
        completedMilestones
      });
    } catch (error) {
      console.error('Error getting learning roadmap:', error);
      return this.sendErrorResponse(res, 'I couldn\'t retrieve your learning roadmap. Please try again.');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(req, res, parameters) {
    try {
      const userId = parameters.userId || parameters.user_id;

      if (!userId) {
        return this.sendResponse(res, 'Please log in to view your profile.');
      }

      const user = await User.findOne({ firebaseUid: userId });
      if (!user) {
        return this.sendErrorResponse(res, 'User not found.');
      }

      const skills = user.skills?.map(s => `${s.name} (${s.level})`).join(', ') || 'No skills added yet';
      const careerGoal = user.careerGoal || 'Not set';
      const education = user.education || 'Not specified';

      let message = `Here's your profile summary:\n\n`;
      message += `Name: ${user.name}\n`;
      message += `Career Goal: ${careerGoal}\n`;
      message += `Education: ${education}\n`;
      message += `Skills: ${skills}\n\n`;
      message += 'Would you like to update any of these details?';

      return this.sendResponse(res, message, {
        userName: user.name,
        careerGoal,
        education,
        skillCount: user.skills?.length || 0
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      return this.sendErrorResponse(res, 'I couldn\'t retrieve your profile. Please try again.');
    }
  }

  /**
   * Get user's overall progress summary
   */
  async getProgressSummary(req, res, parameters) {
    try {
      const userId = parameters.userId || parameters.user_id;

      if (!userId) {
        return this.sendResponse(res, 'Please log in to view your progress.');
      }

      const user = await User.findOne({ firebaseUid: userId });
      if (!user) {
        return this.sendErrorResponse(res, 'User not found.');
      }

      const resumeScore = user.resumeAnalysis?.atsScore || 0;
      const completedInterviews = user.mockInterviews?.length || 0;
      const skillsCount = user.skills?.length || 0;

      const roadmaps = await Roadmap.find({ userId: user._id, isActive: true });
      const activeRoadmaps = roadmaps.length;

      let message = `Here's your progress summary:\n\n`;
      message += `📄 Resume ATS Score: ${resumeScore}/100\n`;
      message += `🎤 Mock Interviews Completed: ${completedInterviews}\n`;
      message += `🎯 Skills Added: ${skillsCount}\n`;
      message += `🗺️ Active Learning Paths: ${activeRoadmaps}\n\n`;

      if (resumeScore < 60) {
        message += 'Recommendation: Focus on improving your resume score first.\n';
      } else if (completedInterviews < 3) {
        message += 'Recommendation: Practice more mock interviews to boost your confidence.\n';
      } else {
        message += 'Great progress! Keep building your skills and exploring opportunities.\n';
      }

      return this.sendResponse(res, message, {
        resumeScore,
        completedInterviews,
        skillsCount,
        activeRoadmaps
      });
    } catch (error) {
      console.error('Error getting progress summary:', error);
      return this.sendErrorResponse(res, 'I couldn\'t retrieve your progress summary. Please try again.');
    }
  }

  /**
   * Validate if a skill exists or is valid
   */
  async validateSkill(req, res, parameters) {
    try {
      const skillName = parameters.skill || parameters.skillName;

      if (!skillName) {
        return this.sendResponse(res, 'Please specify the skill you want to validate.');
      }

      // Common skills database (you can expand this or query from a skills database)
      const commonSkills = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
        'Communication', 'Leadership', 'Project Management', 'Data Analysis',
        'Machine Learning', 'AWS', 'Docker', 'Git', 'TypeScript'
      ];

      const isValid = commonSkills.some(skill =>
        skill.toLowerCase() === skillName.toLowerCase()
      );

      if (isValid) {
        return this.sendResponse(
          res,
          `Yes, "${skillName}" is a recognized skill! Would you like to add it to your profile?`,
          { skillName, isValid: true }
        );
      } else {
        return this.sendResponse(
          res,
          `"${skillName}" is not in our common skills list, but you can still add it to your profile as a custom skill. Would you like to proceed?`,
          { skillName, isValid: false }
        );
      }
    } catch (error) {
      console.error('Error validating skill:', error);
      return this.sendErrorResponse(res, 'I couldn\'t validate the skill. Please try again.');
    }
  }

  /**
   * Check user's interview practice status
   */
  async checkInterviewStatus(req, res, parameters) {
    try {
      const userId = parameters.userId || parameters.user_id;

      if (!userId) {
        return this.sendResponse(res, 'Please log in to check your interview status.');
      }

      const user = await User.findOne({ firebaseUid: userId });
      if (!user) {
        return this.sendErrorResponse(res, 'User not found.');
      }

      const completedInterviews = user.mockInterviews?.length || 0;
      const averageScore = completedInterviews > 0
        ? user.mockInterviews.reduce((sum, interview) => sum + (interview.score || 0), 0) / completedInterviews
        : 0;

      let message = '';

      if (completedInterviews === 0) {
        message = 'You haven\'t completed any mock interviews yet. Would you like to start your first practice interview?';
      } else {
        message = `You've completed ${completedInterviews} mock interview${completedInterviews > 1 ? 's' : ''} `;
        message += `with an average score of ${Math.round(averageScore)}%.\n\n`;

        if (averageScore >= 80) {
          message += 'Excellent performance! You\'re well-prepared for real interviews.';
        } else if (averageScore >= 60) {
          message += 'Good progress! A few more practice sessions will boost your confidence.';
        } else {
          message += 'Keep practicing! Each interview helps you improve.';
        }

        message += '\n\nWould you like to start another mock interview?';
      }

      return this.sendResponse(res, message, {
        completedInterviews,
        averageScore: Math.round(averageScore)
      });
    } catch (error) {
      console.error('Error checking interview status:', error);
      return this.sendErrorResponse(res, 'I couldn\'t check your interview status. Please try again.');
    }
  }

  /**
   * Send successful webhook response
   */
  sendResponse(res, message, sessionParameters = {}) {
    return res.json({
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: [message]
            }
          }
        ]
      },
      sessionInfo: {
        parameters: sessionParameters
      }
    });
  }

  /**
   * Send error webhook response
   */
  sendErrorResponse(res, message) {
    return res.json({
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: [message]
            }
          }
        ]
      }
    });
  }
}

module.exports = new DialogflowWebhookController();
