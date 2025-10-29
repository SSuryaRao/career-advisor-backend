const vertexAI = require('./vertexAI');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const User = require('../models/User');

/**
 * Job Recommendation Service
 * Uses Vertex AI (Gemini) to provide intelligent job recommendations
 */
class JobRecommendationService {
  /**
   * Get personalized job recommendations for a user
   * @param {string} firebaseUid - Firebase User ID
   * @param {Object} options - Options (limit, includeReasons)
   * @returns {Promise<Array>} Recommended jobs with match scores
   */
  async getRecommendations(firebaseUid, options = {}) {
    try {
      const {
        limit = 10,
        includeReasons = true,
        minMatchScore = 50
      } = options;

      // 1. Get user profile and resume data
      const userData = await this.getUserData(firebaseUid);

      if (!userData.hasProfile) {
        return {
          success: false,
          message: 'Please complete your profile and upload a resume to get personalized recommendations',
          recommendations: []
        };
      }

      // 2. Get available jobs (active, recent)
      const availableJobs = await Job.find({
        isActive: true,
        postedAt: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // Last 60 days
      })
      .sort({ postedAt: -1 })
      .limit(8) // Analyze top 8 recent jobs (reduced to prevent MAX_TOKENS truncation)
      .lean();

      if (availableJobs.length === 0) {
        return {
          success: true,
          message: 'No jobs available at the moment',
          recommendations: []
        };
      }

      // 3. Use Vertex AI to match jobs
      const recommendations = await this.matchJobsWithAI(userData, availableJobs, {
        limit,
        includeReasons,
        minMatchScore
      });

      return {
        success: true,
        recommendations,
        total: recommendations.length
      };

    } catch (error) {
      console.error('Error in getRecommendations:', error);
      throw error;
    }
  }

  /**
   * Get user data (profile + resume)
   * @param {string} firebaseUid - Firebase UID
   * @returns {Promise<Object>}
   */
  async getUserData(firebaseUid) {
    try {
      // Get user profile by Firebase UID
      const user = await User.findByFirebaseUid(firebaseUid);

      if (!user) {
        return { hasProfile: false };
      }

      // Get latest resume using MongoDB _id
      const resume = await Resume.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean();

      return {
        hasProfile: true,
        user: {
          name: user.name || 'User',
          email: user.email,
          preferences: {
            jobType: user.preferences?.jobTypes || [],
            locations: user.preferences?.preferredLocations || [],
            remoteWork: user.preferences?.remotePreference !== 'office-based',
            salaryExpectation: user.preferences?.salaryRange || null
          }
        },
        resume: resume ? {
          skills: resume.skills || [],
          experience: resume.experience || [],
          education: resume.education || [],
          summary: resume.summary || '',
          yearsOfExperience: this.calculateYearsOfExperience(resume.experience)
        } : null
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { hasProfile: false };
    }
  }

  /**
   * Calculate years of experience from experience array
   * @param {Array} experience
   * @returns {number}
   */
  calculateYearsOfExperience(experience) {
    if (!experience || experience.length === 0) return 0;

    let totalMonths = 0;
    experience.forEach(exp => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += months;
      }
    });

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
  }

  /**
   * Match jobs using Vertex AI
   * @param {Object} userData
   * @param {Array} jobs
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async matchJobsWithAI(userData, jobs, options = {}) {
    try {
      const { limit, includeReasons, minMatchScore } = options;

      // Build AI prompt
      const prompt = this.buildRecommendationPrompt(userData, jobs);

      // Call Vertex AI with increased max tokens
      console.log('🤖 Calling Vertex AI for job recommendations...');
      const aiResponse = await vertexAI.generateContent(
        prompt,
        3, // retries
        {
          maxOutputTokens: 8192, // Increased from default to allow longer responses
          temperature: 0.2 // Lower temperature for more consistent JSON formatting
        }
      );

      // Parse AI response
      const recommendations = this.parseAIRecommendations(aiResponse, jobs);

      // Filter by minimum match score
      const filtered = recommendations.filter(rec => rec.matchScore >= minMatchScore);

      // Sort by match score (descending)
      const sorted = filtered.sort((a, b) => b.matchScore - a.matchScore);

      // Limit results
      const limited = sorted.slice(0, limit);

      console.log(`✅ Generated ${limited.length} job recommendations`);

      // If AI returned 0 recommendations, fallback to basic matching
      if (limited.length === 0) {
        console.log('⚠️  AI returned 0 recommendations, falling back to basic matching');
        return this.basicJobMatching(userData, jobs, options);
      }

      return limited;

    } catch (error) {
      console.error('Error in matchJobsWithAI:', error);

      // Fallback: Basic keyword matching
      console.log('⚠️ Falling back to basic keyword matching');
      return this.basicJobMatching(userData, jobs, options);
    }
  }

  /**
   * Build AI prompt for job recommendation
   * @param {Object} userData
   * @param {Array} jobs
   * @returns {string}
   */
  buildRecommendationPrompt(userData, jobs) {
    const { user, resume } = userData;

    // Simplify jobs data for AI (only essential fields)
    const simplifiedJobs = jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      company: job.company,
      description: job.description?.substring(0, 150), // Limit description to 150 chars
      tags: job.tags?.slice(0, 5) || [], // Max 5 tags
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      location: job.location
      // Removed salary to reduce prompt size
    }));

    return `You are an expert career advisor AI. Analyze the user's profile and recommend the best matching jobs.

USER PROFILE:
- Name: ${user.name}
- Years of Experience: ${resume?.yearsOfExperience || 0} years
- Skills: ${resume?.skills?.join(', ') || 'Not specified'}
- Experience: ${resume?.experience?.map(exp => `${exp.title} at ${exp.company}`).join('; ') || 'Not specified'}
- Education: ${resume?.education?.map(edu => `${edu.degree} in ${edu.field}`).join('; ') || 'Not specified'}
- Career Summary: ${resume?.summary || 'Not provided'}
- Job Type Preference: ${user.preferences.jobType?.join(', ') || 'Any'}
- Location Preference: ${user.preferences.locations?.join(', ') || 'Any'}
- Remote Work: ${user.preferences.remoteWork ? 'Preferred' : 'No preference'}

AVAILABLE JOBS (${simplifiedJobs.length} total):
${JSON.stringify(simplifiedJobs, null, 2)}

TASK:
Analyze each job and provide recommendations. For each job, evaluate:
1. Skills match (how well user's skills match job requirements)
2. Experience level match
3. Career fit (does this align with their career progression?)
4. Location/remote preference match

Return ONLY a valid JSON array with this exact format (no markdown, no extra text):
[
  {
    "jobId": "job_id_here",
    "matchScore": 85,
    "reason": "Your React and Node.js skills are a perfect match for this Full Stack role. Your 3 years of experience aligns with their mid-level requirement.",
    "skillGaps": ["TypeScript", "AWS"],
    "careerFit": "This role offers growth in full-stack development, which matches your career trajectory.",
    "strengths": ["React expertise", "Similar company culture", "Remote option available"]
  }
]

CRITICAL RULES:
- matchScore: 0-100 (higher is better)
- Be generous with scoring! Give at least 50+ if any relevant match
- Aim to recommend at least ${Math.min(jobs.length, 5)} jobs
- Keep "reason" under 60 characters - VERY SHORT!
- Keep "careerFit" under 50 characters - VERY SHORT!
- Max 2 skillGaps, max 2 strengths
- Return ONLY valid JSON array, no markdown, no extra text`;
  }

  /**
   * Parse AI recommendations response
   * @param {string} aiResponse
   * @param {Array} jobs
   * @returns {Array}
   */
  parseAIRecommendations(aiResponse, jobs) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = aiResponse.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      // Handle truncated JSON - try to recover partial data
      let recommendations;
      try {
        recommendations = JSON.parse(jsonText);
        console.log('✅ Successfully parsed complete JSON response');
      } catch (parseError) {
        console.log('⚠️ JSON parse failed, attempting to recover partial data...');
        console.log(`   Error: ${parseError.message}`);
        console.log(`   Response length: ${jsonText.length} characters`);

        // Try to fix truncated JSON by finding the last complete object
        const lastCompleteObject = this.findLastCompleteObject(jsonText);
        if (lastCompleteObject) {
          try {
            recommendations = JSON.parse(lastCompleteObject);
            console.log(`✅ Recovered ${recommendations.length} recommendations from partial JSON`);
          } catch (recoveryError) {
            console.error('❌ Recovery also failed:', recoveryError.message);
            throw parseError; // Throw original error
          }
        } else {
          console.error('❌ Could not find any complete objects in response');
          throw parseError;
        }
      }

      if (!Array.isArray(recommendations)) {
        throw new Error('AI response is not an array');
      }

      console.log(`📊 Parsed ${recommendations.length} recommendations from AI`);

      // Enrich recommendations with full job data
      return recommendations.map(rec => {
        const job = jobs.find(j => j._id.toString() === rec.jobId);
        if (!job) return null;

        return {
          ...job,
          matchScore: rec.matchScore,
          matchReason: rec.reason || 'AI-powered recommendation based on your profile',
          skillGaps: rec.skillGaps || [],
          careerFit: rec.careerFit || '',
          strengths: rec.strengths || []
        };
      }).filter(Boolean); // Remove nulls

    } catch (error) {
      console.error('Error parsing AI recommendations:', error);
      console.log('AI Response (first 1000 chars):', aiResponse.substring(0, 1000));
      throw new Error('Failed to parse AI recommendations');
    }
  }

  /**
   * Attempt to recover partial JSON from truncated response
   * @param {string} jsonText
   * @returns {string|null}
   */
  findLastCompleteObject(jsonText) {
    try {
      // Find the position of the last complete object in the array
      let depth = 0;
      let lastCompletePos = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 1) { // We're back inside the main array
            lastCompletePos = i;
          }
        }
      }

      if (lastCompletePos > 0) {
        // Extract everything up to the last complete object and close the array
        let recovered = jsonText.substring(0, lastCompletePos + 1);

        // Make sure we close the array properly
        if (!recovered.trim().endsWith(']')) {
          recovered += '\n]';
        }

        return recovered;
      }

      return null;
    } catch (error) {
      console.error('Error recovering partial JSON:', error);
      return null;
    }
  }

  /**
   * Basic keyword-based job matching (fallback)
   * @param {Object} userData
   * @param {Array} jobs
   * @param {Object} options
   * @returns {Array}
   */
  basicJobMatching(userData, jobs, options = {}) {
    const { limit = 10 } = options;
    const { resume, user } = userData;

    if (!resume || !resume.skills) {
      return jobs.slice(0, limit).map(job => ({
        ...job,
        matchScore: 50,
        matchReason: 'Basic recommendation based on recent postings',
        skillGaps: [],
        careerFit: 'Complete your profile for better recommendations'
      }));
    }

    const userSkills = resume.skills.map(s => s.toLowerCase());

    // Calculate match scores
    const scoredJobs = jobs.map(job => {
      const jobTags = (job.tags || []).map(t => t.toLowerCase());
      const titleWords = job.title.toLowerCase().split(' ');

      // Count skill matches
      const skillMatches = userSkills.filter(skill =>
        jobTags.some(tag => tag.includes(skill) || skill.includes(tag)) ||
        titleWords.some(word => word.includes(skill) || skill.includes(word))
      );

      const matchScore = Math.min(100, 50 + (skillMatches.length * 10));

      return {
        ...job,
        matchScore,
        matchReason: `${skillMatches.length} of your skills match this role: ${skillMatches.slice(0, 3).join(', ')}`,
        skillGaps: [],
        careerFit: 'Good match based on your skills'
      };
    });

    // Sort and limit
    return scoredJobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }
}

module.exports = new JobRecommendationService();
