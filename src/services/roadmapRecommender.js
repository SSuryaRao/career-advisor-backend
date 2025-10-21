const Resume = require('../models/Resume');
const vertexAI = require('./vertexAI');

class RoadmapRecommender {

  /**
   * Get personalized roadmap recommendations based on user's latest resume
   * @param {string} userId - Firebase UID
   * @returns {Promise<Object|null>} Roadmap recommendations or null if no resume found
   */
  async getPersonalizedRoadmap(userId) {
    try {
      // 1. Get user's latest completed resume
      const latestResume = await Resume.findOne({
        userId,
        isActive: true,
        status: 'completed'
      }).sort({ createdAt: -1 });

      if (!latestResume) {
        console.log('No resume found for user:', userId);
        return null; // No resume uploaded
      }

      console.log('📄 Found resume for roadmap recommendation:', latestResume._id);

      // 2. Extract key information from resume analysis
      const skills = latestResume.atsAnalysis?.keywordAnalysis?.found || [];
      const missingSkills = latestResume.atsAnalysis?.keywordAnalysis?.missing || [];
      const suggestedSkills = latestResume.atsAnalysis?.keywordAnalysis?.suggested || [];
      const industry = latestResume.atsAnalysis?.industryMatch?.detectedIndustry || 'Technology';
      const strengths = latestResume.atsAnalysis?.strengths || [];
      const weaknesses = latestResume.atsAnalysis?.weaknesses || [];

      // 3. Determine skill level based on resume content and scores
      const skillLevel = this.calculateSkillLevel(latestResume);

      console.log('🎯 User profile:', { skills: skills.length, industry, skillLevel });

      // 4. Generate personalized roadmap using Vertex AI
      const roadmapSuggestions = await this.generateRoadmapWithAI({
        currentSkills: skills,
        missingSkills: missingSkills,
        suggestedSkills: suggestedSkills,
        industry: industry,
        skillLevel: skillLevel,
        strengths: strengths,
        weaknesses: weaknesses,
        atsScore: latestResume.atsAnalysis?.overallScore || 0,
        textLength: latestResume.textLength
      });

      return {
        recommendedDomain: roadmapSuggestions.careerDomain,
        skillLevel: roadmapSuggestions.skillLevel || skillLevel,
        confidence: roadmapSuggestions.confidence,
        reasons: roadmapSuggestions.reasons,
        skillGaps: roadmapSuggestions.skillGaps || missingSkills.slice(0, 5),
        nextSteps: roadmapSuggestions.nextSteps || [],
        currentStrengths: strengths.slice(0, 3),
        improvementAreas: weaknesses.slice(0, 3),
        resumeId: latestResume._id,
        analyzedAt: latestResume.updatedAt
      };

    } catch (error) {
      console.error('Error generating personalized roadmap:', error);
      throw error;
    }
  }

  /**
   * Calculate skill level from resume analysis
   * @param {Object} resume - Resume document
   * @returns {string} Skill level: 'beginner', 'intermediate', or 'advanced'
   */
  calculateSkillLevel(resume) {
    const atsScore = resume.atsAnalysis?.overallScore || 0;
    const experienceScore = resume.atsAnalysis?.scores?.experience || 0;
    const skillsScore = resume.atsAnalysis?.scores?.skills || 0;
    const keywordsScore = resume.atsAnalysis?.scores?.keywords || 0;

    // Calculate weighted average (experience and skills are more important)
    const avgScore = (
      atsScore * 0.2 +
      experienceScore * 0.35 +
      skillsScore * 0.35 +
      keywordsScore * 0.1
    );

    // Also consider text length as indicator of experience
    const hasSubstantialContent = resume.textLength > 2000;
    const hasGoodSkills = (resume.atsAnalysis?.keywordAnalysis?.found || []).length > 10;

    if (avgScore >= 75 && hasSubstantialContent && hasGoodSkills) {
      return 'advanced';
    } else if (avgScore >= 55 && (hasSubstantialContent || hasGoodSkills)) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Use Vertex AI to generate smart roadmap recommendations
   * @param {Object} userData - User profile data extracted from resume
   * @returns {Promise<Object>} AI-generated recommendations
   */
  async generateRoadmapWithAI(userData) {
    const prompt = `You are a career advisor. Analyze this candidate's resume profile and recommend the best career roadmap.

CANDIDATE PROFILE:
- Current Skills (${userData.currentSkills.length}): ${userData.currentSkills.slice(0, 20).join(', ')}
- Missing/Recommended Skills: ${userData.missingSkills.slice(0, 10).join(', ')}
- Suggested Skills: ${userData.suggestedSkills.slice(0, 10).join(', ')}
- Industry: ${userData.industry}
- Current Level: ${userData.skillLevel}
- ATS Score: ${userData.atsScore}/100
- Strengths: ${userData.strengths.slice(0, 3).join(', ')}
- Improvement Areas: ${userData.weaknesses.slice(0, 3).join(', ')}

TASK:
Recommend the BEST career roadmap domain and skill level for this candidate. Consider:
1. Their current skills and experience level
2. Industry trends and job market demand
3. Natural career progression path
4. Skills they need to acquire

RETURN ONLY VALID JSON (no markdown, no extra text):
{
  "careerDomain": "specific domain name (e.g., 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer')",
  "skillLevel": "beginner|intermediate|advanced",
  "confidence": <number 0-100>,
  "reasons": [
    "3-5 specific reasons why this path suits them",
    "Include skill matches and career progression logic"
  ],
  "skillGaps": [
    "Top 5 specific skills they should learn",
    "Be specific (e.g., 'Docker containerization' not just 'Docker')"
  ],
  "nextSteps": [
    "3-5 actionable next steps in their learning journey",
    "Ordered by priority"
  ]
}

IMPORTANT:
- Choose realistic career domain based on their current skills
- Confidence should reflect how well their profile matches the recommended path
- Be specific with skill names and technologies
- Consider Indian job market trends
- Return ONLY the JSON object, no extra text`;

    try {
      console.log('🤖 Generating AI recommendations...');

      const responseText = await vertexAI.generateContent(
        prompt,
        3, // 3 retries
        {
          maxOutputTokens: 3072,  // Increased to ensure complete responses
          temperature: 0.3  // Lower temperature for more consistent, complete recommendations
        }
      );

      // Parse AI response
      let jsonResponse = responseText.trim();

      // Extract JSON if wrapped in markdown code blocks
      if (jsonResponse.includes('```json')) {
        const jsonMatch = jsonResponse.match(/```json\s*\n([\s\S]*?)\n\s*```/);
        jsonResponse = jsonMatch ? jsonMatch[1].trim() : jsonResponse;
      } else if (jsonResponse.includes('```')) {
        const jsonMatch = jsonResponse.match(/```\s*\n([\s\S]*?)\n\s*```/);
        jsonResponse = jsonMatch ? jsonMatch[1].trim() : jsonResponse;
      }

      // Remove any remaining backticks
      jsonResponse = jsonResponse.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/\s*```$/g, '');

      let recommendations;
      try {
        recommendations = JSON.parse(jsonResponse);

        // Validate required fields
        if (!recommendations.careerDomain || !recommendations.confidence || !recommendations.reasons) {
          throw new Error('Missing required fields in AI response');
        }

        console.log('✅ AI recommendations generated successfully');
        console.log(`   Domain: ${recommendations.careerDomain}, Confidence: ${recommendations.confidence}%`);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        console.error('📄 Response length:', jsonResponse.length, 'characters');
        console.error('📝 First 300 chars:', jsonResponse.substring(0, 300));
        console.error('📝 Last 300 chars:', jsonResponse.substring(Math.max(0, jsonResponse.length - 300)));

        // Fallback recommendations
        console.log('⚠️ Using fallback recommendations due to parse error');
        recommendations = this.getFallbackRecommendations(userData);
      }

      return recommendations;

    } catch (error) {
      console.error('❌ Vertex AI recommendation failed:', error.message);

      // Return fallback recommendations
      return this.getFallbackRecommendations(userData);
    }
  }

  /**
   * Fallback recommendations when AI fails
   * @param {Object} userData - User profile data
   * @returns {Object} Fallback recommendations
   */
  getFallbackRecommendations(userData) {
    console.log('⚠️ Using fallback recommendations');

    // Simple logic-based recommendation
    const skills = userData.currentSkills.map(s => s.toLowerCase());
    let domain = 'Full Stack Developer';
    let confidence = 70;

    // Detect domain based on skills
    if (skills.some(s => s.includes('data') || s.includes('python') || s.includes('machine learning'))) {
      domain = 'Data Scientist';
      confidence = 75;
    } else if (skills.some(s => s.includes('react') || s.includes('frontend') || s.includes('css'))) {
      domain = 'Frontend Developer';
      confidence = 80;
    } else if (skills.some(s => s.includes('backend') || s.includes('node') || s.includes('api'))) {
      domain = 'Backend Developer';
      confidence = 80;
    } else if (skills.some(s => s.includes('devops') || s.includes('docker') || s.includes('kubernetes'))) {
      domain = 'DevOps Engineer';
      confidence = 75;
    } else if (skills.some(s => s.includes('mobile') || s.includes('android') || s.includes('ios'))) {
      domain = 'Mobile App Developer';
      confidence = 75;
    }

    return {
      careerDomain: domain,
      skillLevel: userData.skillLevel,
      confidence: confidence,
      reasons: [
        `Your current skill set aligns well with ${domain} roles`,
        `Your ATS score of ${userData.atsScore}/100 indicates ${userData.skillLevel} level readiness`,
        `${userData.industry} industry has strong demand for this role`,
        `Your profile shows potential for growth in this direction`
      ],
      skillGaps: userData.missingSkills.slice(0, 5),
      nextSteps: [
        'Focus on building projects showcasing your skills',
        'Learn the recommended missing skills from your ATS analysis',
        'Practice coding challenges and system design',
        'Build a strong portfolio with 3-5 quality projects',
        'Network with professionals in your target domain'
      ]
    };
  }

  /**
   * Get trending skills for a specific domain (for future use)
   * @param {string} domain - Career domain
   * @returns {Promise<Array>} Trending skills
   */
  async getTrendingSkills(domain) {
    // TODO: Integrate with job market APIs or BigQuery for real trends
    // For now, return common trending skills by domain
    const trendingByDomain = {
      'Full Stack Developer': ['React', 'Node.js', 'TypeScript', 'Docker', 'AWS', 'GraphQL', 'Next.js'],
      'Data Scientist': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Pandas', 'Scikit-learn'],
      'Frontend Developer': ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Vue.js', 'GraphQL'],
      'Backend Developer': ['Node.js', 'Python', 'PostgreSQL', 'Redis', 'Docker', 'Microservices', 'Kubernetes'],
      'DevOps Engineer': ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Jenkins', 'Ansible'],
      'Mobile App Developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'GraphQL']
    };

    return trendingByDomain[domain] || trendingByDomain['Full Stack Developer'];
  }
}

// Export singleton instance
module.exports = new RoadmapRecommender();
