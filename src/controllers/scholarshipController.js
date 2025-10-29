const vertexAI = require('../services/vertexAI');
const User = require('../models/User');
const Resume = require('../models/Resume');
const Scholarship = require('../models/Scholarship');

/**
 * GET /api/scholarships - Get all scholarships with filters
 */
exports.getAllScholarships = async (req, res) => {
  try {
    const {
      category,
      domain,
      trending,
      limit = 100,
      page = 1,
      excludeCategory,  // New parameter to exclude a category
      sortBy = 'deadline'  // Default sort by deadline
    } = req.query;

    // Build filter
    const filter = { active: true };

    // Priority: excludeCategory takes precedence over category
    if (excludeCategory) {
      // Support excluding a category (e.g., exclude 'Internship' when fetching scholarships)
      filter.category = { $ne: excludeCategory };
    } else if (category && category !== 'all') {
      filter.category = category;
    }

    if (domain && domain !== 'all') {
      filter.domain = domain;
    }

    if (trending === 'true') {
      filter.trending = true;
    }

    // Calculate pagination
    const skip = (page - 1) * parseInt(limit);

    // Build sort object
    let sortObject = {};
    switch (sortBy) {
      case 'deadline':
        sortObject = { trending: -1, deadline: 1, createdAt: -1 };
        break;
      case 'amount':
        // Amount is a string, so we'll sort by trending first, then createdAt
        // Ideally, amount should be a number in the DB
        sortObject = { trending: -1, createdAt: -1 };
        break;
      case 'trending':
        sortObject = { trending: -1, createdAt: -1 };
        break;
      case 'recent':
        sortObject = { createdAt: -1 };
        break;
      default:
        sortObject = { trending: -1, deadline: 1, createdAt: -1 };
    }

    console.log('📊 Scholarship Query:', {
      filter: JSON.stringify(filter),
      sortBy,
      sortObject,
      page: parseInt(page),
      limit: parseInt(limit),
      skip
    });

    // Get scholarships
    const scholarships = await Scholarship.find(filter)
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Scholarship.countDocuments(filter);

    res.json({
      success: true,
      data: scholarships,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scholarships'
    });
  }
};

/**
 * POST /api/scholarships/personalized - Get AI-powered personalized recommendations
 */
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const { uid } = req.user;

    console.log(`🎯 Generating personalized recommendations for user: ${uid}`);

    // 1. Get user profile
    const user = await User.findOne({ firebaseUid: uid }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please complete your profile first.'
      });
    }

    // 2. Get user's latest resume (if available)
    const latestResume = await Resume.findOne({
      userId: uid,
      isActive: true,
      status: 'completed'
    })
    .sort({ createdAt: -1 })
    .select('atsAnalysis extractedText createdAt')
    .lean();

    // 3. Get all active scholarships
    const allScholarships = await Scholarship.find({ active: true }).lean();

    if (allScholarships.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: {
          message: 'No scholarships available at the moment. Check back soon!',
          totalMatches: 0
        }
      });
    }

    // 4. Build AI prompt for personalized matching
    const prompt = buildMatchingPrompt(user, latestResume, allScholarships);

    console.log('🤖 Sending request to Vertex AI...');

    // 5. Call Vertex AI for matching
    const aiResponse = await vertexAI.generateContent(prompt);

    // 6. Parse AI response
    let matches = [];
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();

      // Remove ```json and ``` markers
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/```\s*$/g, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/g, '').replace(/```\s*$/g, '');

      // Extract JSON array (greedy match to get complete array)
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);

      let jsonToParse = jsonMatch ? jsonMatch[0] : cleanedResponse;

      // Try to fix common JSON issues
      // 1. Fix incomplete strings by finding the last complete object
      const lastCompleteMatch = jsonToParse.lastIndexOf('}');
      if (lastCompleteMatch > 0 && !jsonToParse.endsWith(']')) {
        // JSON might be truncated, try to salvage what we can
        jsonToParse = jsonToParse.substring(0, lastCompleteMatch + 1) + ']';
      }

      // 2. Remove trailing commas before closing brackets
      jsonToParse = jsonToParse.replace(/,(\s*[\]}])/g, '$1');

      // Try parsing
      matches = JSON.parse(jsonToParse);

      // Validate that we got an array
      if (!Array.isArray(matches)) {
        throw new Error('AI response is not a JSON array');
      }

      console.log(`✅ Successfully parsed ${matches.length} scholarship matches`);

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI Response (first 2000 chars):', aiResponse.substring(0, 2000));

      // Try one more time with a more aggressive extraction
      try {
        // Split by objects and try to parse each one
        const objects = [];
        let depth = 0;
        let currentObj = '';

        for (let i = 0; i < aiResponse.length; i++) {
          const char = aiResponse[i];

          if (char === '{') {
            depth++;
            currentObj += char;
          } else if (char === '}') {
            currentObj += char;
            depth--;

            if (depth === 0 && currentObj.includes('scholarshipId')) {
              try {
                const parsed = JSON.parse(currentObj);
                if (parsed.scholarshipId) {
                  objects.push(parsed);
                }
              } catch (e) {
                // Skip invalid objects
              }
              currentObj = '';
            }
          } else if (depth > 0) {
            currentObj += char;
          }
        }

        if (objects.length > 0) {
          matches = objects;
          console.log(`⚠️ Used fallback parsing, recovered ${matches.length} matches`);
        } else {
          throw new Error('Could not extract any valid scholarship objects');
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return res.status(500).json({
          success: false,
          error: 'Failed to generate recommendations. Please try again.',
          details: process.env.NODE_ENV === 'development' ? aiResponse.substring(0, 500) : undefined
        });
      }
    }

    // 7. Enrich matches with full scholarship data
    const recommendations = matches
      .map(match => {
        const scholarship = allScholarships.find(
          s => s._id.toString() === match.scholarshipId
        );

        if (!scholarship) {
          console.warn(`Scholarship ${match.scholarshipId} not found`);
          return null;
        }

        return {
          ...scholarship,
          _id: scholarship._id,
          aiRecommendation: {
            matchScore: match.matchScore || 0,
            matchReason: match.matchReason || 'Good match based on your profile',
            eligibilityStatus: match.eligibilityStatus || 'CheckDetails',
            actionSteps: match.actionSteps || [],
            priority: match.priority || 'Medium'
          }
        };
      })
      .filter(Boolean) // Remove nulls
      .sort((a, b) => b.aiRecommendation.matchScore - a.aiRecommendation.matchScore); // Sort by score

    // 8. Log activity
    if (user) {
      await User.findOneAndUpdate(
        { firebaseUid: uid },
        {
          $push: {
            activityLog: {
              $each: [{
                action: 'personalized_scholarships_viewed',
                details: {
                  count: recommendations.length,
                  hasResume: !!latestResume,
                  topMatch: recommendations[0]?.aiRecommendation?.matchScore || 0
                },
                timestamp: new Date()
              }],
              $slice: -100 // Keep only last 100 activities
            }
          }
        }
      );
    }

    console.log(`✅ Generated ${recommendations.length} personalized recommendations`);

    res.json({
      success: true,
      data: recommendations,
      meta: {
        totalMatches: recommendations.length,
        basedOnResume: !!latestResume,
        resumeAnalyzedOn: latestResume?.createdAt,
        generatedAt: new Date(),
        userProfile: {
          hasSkills: (user.skills?.length || 0) > 0,
          hasCareerGoal: !!user.profile?.careerGoal,
          hasEducation: !!user.profile?.education
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in personalized recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personalized recommendations',
      message: error.message
    });
  }
};

/**
 * Build AI matching prompt
 */
function buildMatchingPrompt(user, resume, scholarships) {
  let prompt = `You are an expert scholarship advisor for Indian students. Match scholarships to this student profile.

## Student Profile:
- Name: ${user.name}
- Education: ${user.profile?.education || 'Not specified'}
- Skills: ${user.skills?.map(s => `${s.name} (${s.level})`).join(', ') || 'Not specified'}
- Career Goal: ${user.profile?.careerGoal || 'Not specified'}
- Interests: ${user.profile?.interests?.join(', ') || 'Not specified'}
- Location: ${user.profile?.location || 'India'}
`;

  if (resume) {
    prompt += `\n## Resume Analysis:
- ATS Score: ${resume.atsAnalysis?.overallScore || 'N/A'}/100
- Keywords Score: ${resume.atsAnalysis?.scores?.keywords || 'N/A'}/100
- Skills Score: ${resume.atsAnalysis?.scores?.skills || 'N/A'}/100
- Key Skills Found: ${resume.atsAnalysis?.keywordAnalysis?.found?.slice(0, 10).join(', ') || 'N/A'}
- Strengths: ${resume.atsAnalysis?.strengths?.join(', ') || 'N/A'}
- Resume Extract: ${resume.extractedText?.substring(0, 400)}...
`;
  } else {
    prompt += `\n## Resume: Not uploaded yet (match based on profile only)
`;
  }

  prompt += `\n## Available Scholarships (${scholarships.length} total):
${scholarships.slice(0, 50).map((s, i) => `
${i + 1}. ${s.title}
   Provider: ${s.provider}
   Amount: ${s.amount}
   Category: ${s.category}
   Domain: ${s.domain}
   Eligibility: ${s.eligibility}
   Deadline: ${new Date(s.deadline).toLocaleDateString('en-IN')}
   ID: ${s._id}
`).join('')}

${scholarships.length > 50 ? `... and ${scholarships.length - 50} more scholarships` : ''}

## Your Task:
Analyze the student profile${resume ? ' and resume' : ''}, then rank scholarships by relevance.

**CRITICAL INSTRUCTIONS**:
1. Return ONLY a valid JSON array (no markdown, no explanations)
2. Start with [ and end with ]
3. Keep ALL strings SHORT to avoid truncation

Example format:
[{"scholarshipId":"id1","matchScore":95,"matchReason":"Perfect for CSE with Python","eligibilityStatus":"Eligible","actionSteps":["Update resume","Apply now","Prepare docs"],"priority":"High"}]

**STRICT Requirements**:
- Return ONLY top 8 best matches (matchScore >= 60)
- Sort by matchScore descending
- matchReason: MAX 60 characters (ultra-short!)
- eligibilityStatus: "Eligible" | "MayBeEligible" | "CheckDetails"
- priority: "High" | "Medium" | "Low"
- actionSteps: MAX 3 steps, each MAX 40 characters
- Use exact scholarshipId from list above
- NO markdown blocks (no \`\`\`)
- NO trailing commas
`;

  return prompt;
}

/**
 * GET /api/scholarships/:id - Get single scholarship
 */
exports.getScholarshipById = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarship.findById(id);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        error: 'Scholarship not found'
      });
    }

    res.json({
      success: true,
      data: scholarship
    });

  } catch (error) {
    console.error('Error fetching scholarship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scholarship'
    });
  }
};

/**
 * GET /api/scholarships/trending - Get trending scholarships
 */
exports.getTrendingScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarship.find({
      active: true,
      trending: true
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: scholarships
    });

  } catch (error) {
    console.error('Error fetching trending scholarships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending scholarships'
    });
  }
};
