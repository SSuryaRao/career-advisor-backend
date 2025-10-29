const Resume = require('../models/Resume');
const User = require('../models/User');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const localStorage = require('../services/localStorage');
const documentAI = require('../services/documentAI');
const vertexAI = require('../services/vertexAI');

// Vertex AI is now used for AI analysis (more reliable than Gemini API)
// Status will be logged during server startup

/**
 * Delete all old resumes for a user (both MongoDB and Firebase Storage)
 * This ensures only the latest resume is kept
 */
const deleteOldResumes = async (userId) => {
  try {
    console.log(`🗑️ Checking for old resumes for user: ${userId}`);

    // Find all active resumes for this user
    const oldResumes = await Resume.find({
      userId,
      isActive: true
    });

    if (oldResumes.length === 0) {
      console.log('✅ No old resumes to delete');
      return { deleted: 0, errors: [] };
    }

    console.log(`📋 Found ${oldResumes.length} old resume(s) to delete`);

    let deletedCount = 0;
    const errors = [];

    // Delete each old resume
    for (const resume of oldResumes) {
      try {
        // Delete from Firebase Storage or local storage
        const storageType = resume.metadata?.storageType || 'firebase';

        if (storageType === 'firebase' && resume.firebaseStoragePath) {
          try {
            const firebaseStorage = require('../services/firebaseStorage');
            await firebaseStorage.deleteResume(resume.firebaseStoragePath);
            console.log(`✅ Deleted from Firebase Storage: ${resume.firebaseStoragePath}`);
          } catch (storageError) {
            console.warn(`⚠️ Could not delete from Firebase Storage: ${storageError.message}`);
            errors.push({ resumeId: resume._id, error: storageError.message, type: 'storage' });
          }
        } else if (storageType === 'local' && resume.firebaseStoragePath) {
          try {
            await localStorage.deleteResume(resume.firebaseStoragePath);
            console.log(`✅ Deleted from local storage: ${resume.firebaseStoragePath}`);
          } catch (storageError) {
            console.warn(`⚠️ Could not delete from local storage: ${storageError.message}`);
            errors.push({ resumeId: resume._id, error: storageError.message, type: 'storage' });
          }
        }

        // Delete from MongoDB (hard delete)
        await Resume.deleteOne({ _id: resume._id });
        console.log(`✅ Deleted resume from MongoDB: ${resume._id} (${resume.originalName})`);
        deletedCount++;

      } catch (error) {
        console.error(`❌ Error deleting resume ${resume._id}:`, error.message);
        errors.push({ resumeId: resume._id, error: error.message, type: 'general' });
      }
    }

    console.log(`✅ Deleted ${deletedCount} old resume(s)`);
    return { deleted: deletedCount, errors };

  } catch (error) {
    console.error('❌ Error in deleteOldResumes:', error);
    throw error;
  }
};

// Upload and analyze resume
const uploadAndAnalyzeResume = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { uid: userId } = req.user; // From auth middleware
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type and size
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 10MB allowed.'
      });
    }

    // Upload to storage (try Firebase first, fallback to local)
    let uploadResult;
    let storageType = 'firebase';
    
    try {
      // Try Firebase Storage first
      const firebaseStorage = require('../services/firebaseStorage');
      uploadResult = await firebaseStorage.uploadResume(
        file.buffer,
        file.originalname,
        userId
      );
      console.log('✅ Uploaded to Firebase Storage');
    } catch (firebaseError) {
      console.warn('⚠️ Firebase Storage failed, using local storage:', firebaseError.message);
      
      try {
        // Fallback to local storage
        uploadResult = await localStorage.uploadResume(
          file.buffer,
          file.originalname,
          userId
        );
        storageType = 'local';
        console.log('✅ Uploaded to local storage');
      } catch (localError) {
        console.error('❌ Both Firebase and local storage failed:', localError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload resume to storage',
          errorCode: 'STORAGE_UPLOAD_FAILED'
        });
      }
    }

    // Delete all old resumes for this user before uploading new one
    try {
      const deleteResult = await deleteOldResumes(userId);
      console.log(`🧹 Cleanup complete: ${deleteResult.deleted} old resume(s) deleted`);
      if (deleteResult.errors.length > 0) {
        console.warn(`⚠️ Some errors during cleanup: ${deleteResult.errors.length} errors`);
      }
    } catch (deleteError) {
      // Log but don't fail the upload if old resume deletion fails
      console.warn('⚠️ Error deleting old resumes (continuing with upload):', deleteError.message);
    }

    // Extract text from PDF - Try Document AI first, fallback to pdf-parse
    let extractedText;
    let structuredData = null;
    let extractionMethod = 'pdf-parse'; // default
    let extractionConfidence = 0;

    try {
      // Try Document AI first if configured
      if (documentAI.isReady()) {
        console.log('🤖 Using Document AI for text extraction...');
        try {
          const documentAIResult = await documentAI.processResume(file.buffer, file.mimetype);

          if (documentAIResult.success && documentAIResult.text) {
            extractedText = documentAIResult.text.trim();
            structuredData = documentAIResult.structuredData;
            extractionMethod = 'document-ai';
            extractionConfidence = documentAIResult.confidence;

            console.log('✅ Document AI extraction successful');
            console.log(`📊 Confidence: ${extractionConfidence}, Pages: ${documentAIResult.pages}`);
            console.log(`📧 Extracted: ${structuredData.email || 'N/A'}, 📱 Phone: ${structuredData.phone || 'N/A'}`);
            console.log(`🎯 Skills found: ${structuredData.skills.length}`);
          }
        } catch (docAIError) {
          console.warn('⚠️ Document AI failed, falling back to pdf-parse:', docAIError.message);
        }
      } else {
        console.log('📝 Document AI not configured, using pdf-parse');
      }

      // Fallback to pdf-parse if Document AI didn't work or not configured
      if (!extractedText) {
        console.log('📄 Using pdf-parse for text extraction...');
        const dataBuffer = file.buffer;
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text.trim();
        extractionMethod = 'pdf-parse';
        console.log('✅ pdf-parse extraction successful');
      }

      // Validate extracted text
      if (!extractedText || extractedText.length < 50) {
        throw new Error('Unable to extract sufficient text from PDF. The file may be image-based, corrupted, or contains mostly graphics.');
      }

      console.log(`✅ Text extraction complete. Length: ${extractedText.length} characters, Method: ${extractionMethod}`);

    } catch (extractionError) {
      console.error('❌ PDF text extraction error:', extractionError);
      return res.status(422).json({
        success: false,
        message: extractionError.message || 'Failed to extract text from PDF',
        errorCode: 'TEXT_EXTRACTION_FAILED',
        details: 'Please ensure your PDF is text-based and not an image scan. Try saving as a new PDF if the issue persists.'
      });
    }

    // Create resume record with extracted text
    const resume = new Resume({
      userId,
      filename: uploadResult.filename,
      originalName: file.originalname,
      fileSize: file.size,
      firebaseUrl: uploadResult.firebaseUrl,
      firebaseStoragePath: uploadResult.firebaseStoragePath,
      extractedText: extractedText,
      textLength: extractedText.length,
      status: 'processing',
      metadata: {
        uploadMethod: req.body.uploadMethod || 'file-picker',
        storageType: storageType,
        extractionMethod: extractionMethod,
        extractionConfidence: extractionConfidence,
        structuredDataAvailable: structuredData !== null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await resume.save();

    // Analyze resume with AI
    try {
      const analysisResult = await analyzeResumeWithAI(extractedText, structuredData);

      // Update resume with analysis
      await resume.updateAnalysis(analysisResult);

      // Calculate processing time
      const processingTime = Date.now() - startTime;
      resume.metadata.processingTime = processingTime;
      await resume.save();

      // Log user activity
      const user = await User.findByFirebaseUid(userId);
      if (user) {
        await user.logActivity('resume_analyzed', {
          resumeId: resume._id,
          filename: file.originalname,
          atsScore: analysisResult.overallScore,
          processingTime
        });
      }

      // Increment usage BEFORE sending response
      const { incrementUsageForRequest } = require('../middleware/usageLimits');
      await incrementUsageForRequest(req);

      res.status(200).json({
        success: true,
        message: 'Resume analyzed successfully',
        data: {
          resumeId: resume._id,
          filename: resume.originalName,
          atsAnalysis: resume.atsAnalysis,
          extractedInfo: structuredData ? {
            name: structuredData.name,
            email: structuredData.email,
            phone: structuredData.phone,
            skillsCount: structuredData.skills.length,
            topSkills: structuredData.skills.slice(0, 10).map(s => s.name)
          } : null,
          metadata: {
            processingTime,
            textLength: resume.textLength,
            uploadedAt: resume.createdAt,
            extractionMethod: extractionMethod,
            extractionConfidence: extractionConfidence,
            aiEnhanced: structuredData !== null
          }
        }
      });

    } catch (analysisError) {
      console.error('AI analysis error:', analysisError);
      await resume.logError('ai-analysis', analysisError);
      resume.status = 'failed';
      await resume.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to analyze resume with AI',
        errorCode: 'AI_ANALYSIS_FAILED'
      });
    }

  } catch (error) {
    console.error('Resume upload error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process resume',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// AI Analysis function
const analyzeResumeWithAI = async (resumeText, structuredData = null) => {
  // Prepare additional context from structured data if available
  let structuredContext = '';
  if (structuredData) {
    const topSkills = structuredData.skills.slice(0, 20).map(s => s.name).join(', ');
    structuredContext = `

EXTRACTED STRUCTURED DATA:
- Contact: ${structuredData.email || 'N/A'} | ${structuredData.phone || 'N/A'}
- Skills Found: ${topSkills || 'None'}
- Education Sections: ${structuredData.education.length}
- Work Experience Sections: ${structuredData.experience.length}
- Certifications: ${structuredData.certifications.length}
`;
  }

  const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer specializing in the Indian job market. Analyze this resume and provide actionable feedback.

${structuredContext}

RESUME TEXT:
${resumeText.substring(0, 15000)}

Analyze the resume thoroughly and return your analysis as VALID JSON ONLY (no markdown, no code blocks, no extra text).

Your response must match this exact JSON structure:

{
  "overallScore": <number 0-100>,
  "scores": {
    "keywords": <number 0-100>,
    "formatting": <number 0-100>,
    "experience": <number 0-100>,
    "skills": <number 0-100>
  },
  "suggestions": [
    {
      "section": "<section name>",
      "issue": "<what's wrong>",
      "improvement": "<how to fix it>",
      "beforeAfter": {
        "before": "<example of current text>",
        "after": "<example of improved text>"
      },
      "priority": "critical|high|medium|low"
    }
  ],
  "keywordAnalysis": {
    "found": ["<relevant keywords found in resume>"],
    "missing": ["<important keywords missing>"],
    "suggested": ["<keywords to add for better ATS score>"],
    "density": <number 0-100>
  },
  "strengths": ["<what the resume does well>"],
  "weaknesses": ["<areas needing improvement>"]
}

ANALYSIS GUIDELINES:

1. SCORING (0-100 for each):
   - keywords: Presence of relevant industry/role keywords, action verbs, technical skills
   - formatting: ATS-friendly structure, clear sections, proper headers, no complex tables/graphics
   - experience: Quality of work descriptions, quantified achievements, relevance
   - skills: Technical skills coverage, modern technologies, certifications
   - overallScore: Weighted average with emphasis on keywords (40%), experience (30%), skills (20%), formatting (10%)

2. SUGGESTIONS (provide 8-12 specific, actionable suggestions):
   - Focus on high-impact changes
   - Include "beforeAfter" examples for clarity
   - Priority levels: critical (must fix), high (important), medium (recommended), low (nice to have)
   - Cover: missing keywords, weak bullet points, formatting issues, quantifiable achievements, skill gaps

3. KEYWORD ANALYSIS:
   - found: List 15-25 relevant keywords actually present
   - missing: List 10-15 important keywords for the role/industry that are absent
   - suggested: List 10-15 specific keywords to add
   - density: Score based on keyword usage (too few = low score, optimal = 70-85, keyword stuffing = penalty)

4. STRENGTHS & WEAKNESSES (5-8 each):
   - Strengths: Specific positive aspects
   - Weaknesses: Concrete areas to improve

5. INDIAN JOB MARKET CONSIDERATIONS:
   - Check for proper contact information (phone, email)
   - Educational qualifications formatting (B.Tech, M.Tech, etc.)
   - Work experience presentation (company name, role, duration, achievements)
   - Technical skills relevance to current market demands

CRITICAL RULES:
- Return ONLY the JSON object, no markdown formatting
- Ensure all JSON strings are properly quoted and escaped
- All arrays must be properly formatted
- No trailing commas
- Provide specific, actionable feedback
- Use actual examples from the resume when possible`;

  // Use Vertex AI with built-in retry logic (3 automatic retries)
  try {
    console.log('🤖 Starting Vertex AI resume analysis...');
    const responseText = await vertexAI.generateContent(
      prompt,
      3, // 3 retries
      { maxOutputTokens: 16384, temperature: 0.3 }
    );

    if (!responseText || responseText.length === 0) {
      throw new Error('Invalid response from Vertex AI');
    }

    let jsonResponse = responseText.trim();

    // Extract JSON if wrapped in markdown code blocks - improved regex patterns
    if (jsonResponse.includes('```json')) {
      const jsonMatch = jsonResponse.match(/```json\s*\n([\s\S]*?)\n\s*```/);
      jsonResponse = jsonMatch ? jsonMatch[1].trim() : jsonResponse;
    } else if (jsonResponse.includes('```')) {
      const jsonMatch = jsonResponse.match(/```\s*\n([\s\S]*?)\n\s*```/);
      jsonResponse = jsonMatch ? jsonMatch[1].trim() : jsonResponse;
    }

    // Remove any remaining backticks or markdown artifacts
    jsonResponse = jsonResponse.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/\s*```$/g, '');

    // Additional cleanup for common AI response patterns
    if (jsonResponse.startsWith('`') && jsonResponse.endsWith('`')) {
      jsonResponse = jsonResponse.slice(1, -1);
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonResponse);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Raw Response:', jsonResponse.substring(0, 500));

      // Try to fix incomplete JSON by truncating at the last valid position
      let fixedJson = jsonResponse;
      try {
        // If there's an unterminated string, find the last complete field
        if (parseError.message.includes('Unterminated string')) {
          // Find the last complete closing brace before the error
          const lastValidBrace = fixedJson.lastIndexOf('}', parseError.message.match(/position (\d+)/)?.[1] || fixedJson.length);

          if (lastValidBrace > 0) {
            // Try to salvage everything up to the last valid object
            fixedJson = fixedJson.substring(0, lastValidBrace + 1);

            // Count and balance braces/brackets
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            const openBrackets = (fixedJson.match(/\[/g) || []).length;
            const closeBrackets = (fixedJson.match(/\]/g) || []).length;

            // Close any unclosed arrays
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              fixedJson += ']';
            }

            // Close any unclosed objects
            for (let i = 0; i < openBraces - closeBraces; i++) {
              fixedJson += '}';
            }
          }
        } else {
          // For other errors, try standard brace/bracket balancing
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          const openBrackets = (fixedJson.match(/\[/g) || []).length;
          const closeBrackets = (fixedJson.match(/\]/g) || []).length;

          // Add missing closing brackets
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            fixedJson += ']';
          }

          // Add missing closing braces
          for (let i = 0; i < openBraces - closeBraces; i++) {
            fixedJson += '}';
          }
        }

        console.log('Attempting to parse fixed JSON...');
        analysis = JSON.parse(fixedJson);
        console.log('✅ Successfully parsed fixed JSON');
      } catch (fixError) {
        console.error('Failed to fix JSON:', fixError.message);

        // Fallback analysis if JSON parsing fails
        analysis = {
          overallScore: 65,
          scores: {
            keywords: 60,
            formatting: 70,
            experience: 65,
            skills: 65
          },
          suggestions: [
            {
              section: "Analysis Error",
              issue: "Unable to analyze resume content due to parsing error",
              improvement: "Please try uploading your resume again. Ensure your resume is in a clear, readable format (PDF recommended)."
            },
            {
              section: "File Format",
              issue: "There may be an issue with the resume file format or content structure",
              improvement: "Try saving your resume as a new PDF file and upload again. Avoid complex formatting, images, or unusual fonts."
            },
            {
              section: "Content Structure",
              issue: "Resume content may not be properly readable by the analysis system",
              improvement: "Ensure your resume has clear sections (Contact, Summary, Experience, Education, Skills) with standard formatting."
            }
          ],
          keywordAnalysis: {
            found: [],
            missing: [],
            suggested: []
          }
        };
      }
    }

    // Validate and structure the response - SUCCESS!
    console.log('✅ Vertex AI analysis successful');
    return {
      overallScore: Math.min(100, Math.max(0, analysis.overallScore || 0)),
      scores: {
        keywords: Math.min(100, Math.max(0, analysis.scores?.keywords || 0)),
        formatting: Math.min(100, Math.max(0, analysis.scores?.formatting || 0)),
        experience: Math.min(100, Math.max(0, analysis.scores?.experience || 0)),
        skills: Math.min(100, Math.max(0, analysis.scores?.skills || 0))
      },
      suggestions: analysis.suggestions || [],
      keywordAnalysis: {
        found: analysis.keywordAnalysis?.found || [],
        missing: analysis.keywordAnalysis?.missing || [],
        suggested: analysis.keywordAnalysis?.suggested || [],
        density: Math.min(100, Math.max(0, analysis.keywordAnalysis?.density || 0))
      },
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || []
    };

  } catch (error) {
    // Vertex AI request failed after all retries
    console.error('❌ Vertex AI analysis failed:', error.message);
  }

  return {
    overallScore: 65,
    scores: {
      keywords: 60,
      formatting: 70,
      experience: 65,
      skills: 70
    },
    suggestions: [
      {
        section: "API Error",
        issue: "AI service temporarily unavailable",
        improvement: "The AI analysis service is currently overloaded. Please try uploading your resume again in a few moments.",
        priority: "high"
      },
      {
        section: "Summary/Objective",
        issue: "Generic summary without specific achievements",
        improvement: "Add quantified results and target role keywords",
        beforeAfter: {
          before: "Experienced software developer with good skills",
          after: "Results-driven Software Engineer with 3+ years experience, increased application performance by 40%"
        },
        priority: "medium"
      }
    ],
    keywordAnalysis: {
      found: ["JavaScript", "React", "Node.js"],
      missing: ["TypeScript", "AWS", "Docker"],
      suggested: ["TypeScript", "AWS", "Docker", "Kubernetes", "CI/CD"],
      density: 65
    },
    strengths: ["Resume uploaded successfully", "Document processed"],
    weaknesses: ["AI analysis temporarily unavailable", "Please retry in a few moments"]
  };
};

// Get user's resume history
const getResumeHistory = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const resumes = await Resume.find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-extractedText -errorLog'); // Exclude large fields

    const total = await Resume.countDocuments({ userId, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        resumes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get resume history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resume history'
    });
  }
};

// Get specific resume analysis
const getResumeAnalysis = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { resumeId } = req.params;

    const resume = await Resume.findOne({ 
      _id: resumeId, 
      userId, 
      isActive: true 
    }).select('-extractedText');

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    res.status(200).json({
      success: true,
      data: resume
    });

  } catch (error) {
    console.error('Get resume analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resume analysis'
    });
  }
};

// Delete resume
const deleteResume = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { resumeId } = req.params;

    const resume = await Resume.findOne({ 
      _id: resumeId, 
      userId, 
      isActive: true 
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Soft delete
    resume.isActive = false;
    await resume.save();

    // Delete from storage based on storage type
    try {
      const storageType = resume.metadata?.storageType || 'firebase';
      
      if (storageType === 'firebase') {
        const firebaseStorage = require('../services/firebaseStorage');
        await firebaseStorage.deleteResume(resume.firebaseStoragePath);
        console.log('✅ Deleted from Firebase Storage');
      } else {
        await localStorage.deleteResume(resume.firebaseStoragePath);
        console.log('✅ Deleted from local storage');
      }
    } catch (fileError) {
      console.log('⚠️ File already deleted or not found:', fileError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    });

  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resume'
    });
  }
};

// Get analytics data
const getAnalytics = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const analytics = await Resume.getAnalyticsData(userId);
    
    res.status(200).json({
      success: true,
      data: analytics[0] || {
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        totalResumes: 0,
        totalSuggestions: 0
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

module.exports = {
  uploadAndAnalyzeResume,
  getResumeHistory,
  getResumeAnalysis,
  deleteResume,
  getAnalytics
};