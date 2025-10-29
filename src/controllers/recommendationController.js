const Recommendation = require('../models/Recommendation');
const User = require('../models/User');

class RecommendationController {
  
  // Generate career recommendations based on user profile
  async generateRecommendations(req, res) {
    try {
      const { uid } = req.user;
      console.log('🎯 Generate recommendations for user:', uid);
      
      const user = await User.findByFirebaseUid(uid);
      if (!user) {
        console.log('❌ User not found:', uid);
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Extract user profile data
      const { skills = [], profile = {} } = user;
      const { interests = [], education = '', careerGoal = '' } = profile;
      
      console.log('👤 User profile data:', {
        skillsCount: skills.length,
        interestsCount: interests.length,
        education,
        careerGoal,
        skills: skills.map(s => s.name),
        interests
      });
      
      if (skills.length === 0 && interests.length === 0) {
        console.log('❌ Insufficient profile data for recommendations');
        return res.status(400).json({
          success: false,
          error: 'Please complete your profile with skills and interests first'
        });
      }

      // Generate recommendations based on profile
      const recommendations = this.generateCareerRecommendations(skills, interests, education, careerGoal);
      
      // Save or update recommendations in database
      const existingRecommendation = await Recommendation.findOne({ userId: uid });
      
      if (existingRecommendation) {
        existingRecommendation.recommendations = recommendations;
        await existingRecommendation.save();
      } else {
        await Recommendation.create({
          userId: uid,
          recommendations
        });
      }

      // Increment usage BEFORE sending response
      const { incrementUsageForRequest } = require('../middleware/usageLimits');
      await incrementUsageForRequest(req);

      res.status(200).json({
        success: true,
        data: {
          recommendations,
          generatedAt: new Date(),
          profileCompleteness: this.calculateProfileCompleteness(user)
        }
      });

    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        message: error.message
      });
    }
  }

  // Get user's saved recommendations
  async getRecommendations(req, res) {
    try {
      const { uid } = req.user;
      console.log('🔍 Getting recommendations for user:', uid);
      
      const recommendation = await Recommendation.findOne({ userId: uid }).sort({ generatedAt: -1 });
      console.log('📊 Found recommendations:', recommendation ? 'Yes' : 'No');
      
      if (!recommendation) {
        console.log('❌ No recommendations found for user:', uid);
        return res.status(404).json({
          success: false,
          error: 'No recommendations found. Generate recommendations first.'
        });
      }

      res.status(200).json({
        success: true,
        data: recommendation
      });

    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendations',
        message: error.message
      });
    }
  }

  // Generate career recommendations logic
  generateCareerRecommendations(skills, interests, education, careerGoal) {
    const careerPaths = {
      'Data Science': {
        keywords: ['python', 'data', 'analytics', 'statistics', 'machine learning', 'ai', 'sql', 'pandas', 'numpy'],
        interests: ['ai/ml', 'data science', 'analytics', 'statistics', 'research'],
        roi: { time: '28-32 weeks', cost: 55000, salary: '6-12 LPA', roiFactor: '4.5x in 2 years' },
        trends: 'Extremely high demand in AI/ML and business analytics across all industries',
        previewTopics: ['Mathematics & Statistics', 'Python Programming', 'Machine Learning', 'Data Visualization'],
        domain: 'data-science'
      },
      'Web Development': {
        keywords: ['javascript', 'react', 'node', 'html', 'css', 'frontend', 'backend', 'web', 'api'],
        interests: ['web development', 'programming', 'frontend', 'backend', 'full stack'],
        roi: { time: '20-24 weeks', cost: 35000, salary: '4-10 LPA', roiFactor: '4x in 2 years' },
        trends: 'High demand for full-stack developers and modern web technologies',
        previewTopics: ['HTML/CSS', 'JavaScript', 'React/Node.js', 'Database Integration'],
        domain: 'web-development'
      },
      'Mobile Development': {
        keywords: ['flutter', 'react native', 'mobile', 'android', 'ios', 'app development'],
        interests: ['mobile development', 'app development', 'flutter', 'react native'],
        roi: { time: '24-26 weeks', cost: 40000, salary: '5-12 LPA', roiFactor: '4.2x in 2 years' },
        trends: 'Growing demand for cross-platform mobile apps and native development',
        previewTopics: ['Mobile Fundamentals', 'Flutter/React Native', 'UI/UX Design', 'App Deployment'],
        domain: 'mobile-development'
      },
      'Artificial Intelligence': {
        keywords: ['ai', 'machine learning', 'deep learning', 'neural networks', 'tensorflow', 'pytorch', 'nlp'],
        interests: ['artificial intelligence', 'machine learning', 'deep learning', 'ai research', 'neural networks'],
        roi: { time: '30-36 weeks', cost: 70000, salary: '8-18 LPA', roiFactor: '5x in 2 years' },
        trends: 'Explosive growth in AI adoption across industries with highest salary potential',
        previewTopics: ['AI Fundamentals', 'Machine Learning', 'Deep Learning', 'Neural Networks'],
        domain: 'artificial-intelligence'
      },
      'Cybersecurity': {
        keywords: ['security', 'cybersecurity', 'ethical hacking', 'network security', 'penetration testing'],
        interests: ['cybersecurity', 'ethical hacking', 'network security', 'information security'],
        roi: { time: '28-32 weeks', cost: 60000, salary: '7-15 LPA', roiFactor: '4.8x in 2 years' },
        trends: 'Critical shortage of cybersecurity professionals with excellent job security',
        previewTopics: ['Security Fundamentals', 'Ethical Hacking', 'Network Security', 'Incident Response'],
        domain: 'cybersecurity'
      },
      'Cloud Computing': {
        keywords: ['aws', 'azure', 'cloud', 'devops', 'kubernetes', 'docker', 'infrastructure'],
        interests: ['cloud computing', 'aws', 'azure', 'devops', 'infrastructure'],
        roi: { time: '24-28 weeks', cost: 50000, salary: '6-14 LPA', roiFactor: '4.5x in 2 years' },
        trends: 'High demand as companies migrate to cloud with excellent growth prospects',
        previewTopics: ['Cloud Fundamentals', 'AWS/Azure', 'Containers', 'DevOps'],
        domain: 'cloud-computing'
      },
      'DevOps': {
        keywords: ['devops', 'ci/cd', 'docker', 'kubernetes', 'jenkins', 'automation', 'infrastructure'],
        interests: ['devops', 'automation', 'ci/cd', 'infrastructure', 'deployment'],
        roi: { time: '26-28 weeks', cost: 55000, salary: '7-16 LPA', roiFactor: '4.6x in 2 years' },
        trends: 'Essential role in modern software development with strong job market',
        previewTopics: ['DevOps Culture', 'CI/CD Pipelines', 'Containerization', 'Infrastructure Automation'],
        domain: 'devops'
      },
      'Blockchain': {
        keywords: ['blockchain', 'solidity', 'web3', 'cryptocurrency', 'smart contracts', 'defi'],
        interests: ['blockchain', 'cryptocurrency', 'web3', 'defi', 'smart contracts'],
        roi: { time: '28-30 weeks', cost: 70000, salary: '8-20 LPA', roiFactor: '5.2x in 2 years' },
        trends: 'Emerging field with high salaries and growing adoption in finance and tech',
        previewTopics: ['Blockchain Fundamentals', 'Smart Contracts', 'Solidity', 'DeFi Protocols'],
        domain: 'blockchain'
      }
    };

    const recommendations = [];
    const skillNames = skills.map(s => s.name.toLowerCase());
    const userInterests = interests.map(i => i.toLowerCase());

    // Calculate match scores for each career path
    for (const [careerTitle, careerData] of Object.entries(careerPaths)) {
      let matchScore = 0;
      const matchedSkills = [];
      const matchedInterests = [];

      // Match skills (70% weight)
      skillNames.forEach(skill => {
        if (careerData.keywords.some(keyword => skill.includes(keyword) || keyword.includes(skill))) {
          matchScore += 70 / careerData.keywords.length;
          matchedSkills.push(skill);
        }
      });

      // Match interests (30% weight)
      userInterests.forEach(interest => {
        if (careerData.interests.some(careerInterest => 
          interest.includes(careerInterest) || careerInterest.includes(interest))) {
          matchScore += 30 / careerData.interests.length;
          matchedInterests.push(interest);
        }
      });

      // Include if match score > 15% or if it matches the career goal
      const matchesGoal = careerGoal.toLowerCase().includes(careerTitle.toLowerCase()) || 
                         careerTitle.toLowerCase().includes(careerGoal.toLowerCase());

      if (matchScore > 15 || matchesGoal) {
        if (matchesGoal && matchScore < 30) {
          matchScore = Math.max(matchScore, 30); // Boost score for goal matches
        }

        recommendations.push({
          title: careerTitle,
          matchScore: Math.min(Math.round(matchScore), 100),
          matchedSkills,
          matchedInterests,
          roi: careerData.roi,
          trends: careerData.trends,
          previewTopics: careerData.previewTopics,
          domain: careerData.domain,
          skillLevel: this.determineSkillLevel(skillNames, matchedSkills)
        });
      }
    }

    // Sort by match score and return top 3
    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }

  // Determine skill level based on user skills and matches
  determineSkillLevel(userSkills, matchedSkills) {
    const totalSkills = userSkills.length;
    const matchedCount = matchedSkills.length;
    const matchRatio = matchedCount / Math.max(totalSkills, 1);

    if (matchRatio >= 0.7 || totalSkills >= 5) return 'intermediate';
    if (matchRatio >= 0.4 || totalSkills >= 3) return 'beginner';
    return 'beginner';
  }

  // Calculate profile completeness percentage
  calculateProfileCompleteness(user) {
    const fields = [
      user.profile.education,
      user.profile.interests.length > 0,
      user.skills.length > 0,
      user.profile.careerGoal,
      user.profile.title,
      user.profile.bio
    ];
    
    const completedFields = fields.filter(field => field).length;
    return Math.round((completedFields / fields.length) * 100);
  }
}

module.exports = new RecommendationController();