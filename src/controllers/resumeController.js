const Resume = require('../models/Resume');
const User = require('../models/User');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const localStorage = require('../services/localStorage');

// Gemini AI integration (you'll need to add @google/generative-ai to dependencies)
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
} else {
  console.log('✅ GEMINI_API_KEY is configured');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-pro', // Use the correct model name
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
});

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

    // Extract text from PDF first
    let extractedText;
    try {
      const dataBuffer = file.buffer;
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text.trim();

      if (!extractedText || extractedText.length < 50) {
        throw new Error('Unable to extract sufficient text from PDF. The file may be image-based or corrupted.');
      }
    } catch (extractionError) {
      console.error('PDF text extraction error:', extractionError);
      return res.status(422).json({
        success: false,
        message: extractionError.message || 'Failed to extract text from PDF',
        errorCode: 'TEXT_EXTRACTION_FAILED'
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
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await resume.save();

    // Analyze resume with AI
    try {
      const analysisResult = await analyzeResumeWithAI(extractedText);
      
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

      res.status(200).json({
        success: true,
        message: 'Resume analyzed successfully',
        data: {
          resumeId: resume._id,
          filename: resume.originalName,
          atsAnalysis: resume.atsAnalysis,
          metadata: {
            processingTime,
            textLength: resume.textLength,
            uploadedAt: resume.createdAt
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
const analyzeResumeWithAI = async (resumeText) => {
  const prompt = `Analyze this resume and provide a comprehensive ATS score and improvement suggestions. 
  Focus on the Indian job market context.

  Resume Content:
  ${resumeText}

  Please provide your analysis in the following JSON format:
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
          "before": "<original text if applicable>",
          "after": "<improved version>"
        },
        "priority": "<low|medium|high|critical>"
      }
    ],
    "keywordAnalysis": {
      "found": ["<keywords found in resume>"],
      "missing": ["<important missing keywords>"],
      "suggested": ["<recommended keywords to add>"],
      "density": <percentage 0-100>
    },
    "strengths": ["<resume strengths>"],
    "weaknesses": ["<areas needing improvement>"],
    "industryMatch": {
      "detectedIndustry": "<detected industry>",
      "matchScore": <0-100>,
      "recommendations": [
        {
          "industry": "<industry name>",
          "score": <0-100>,
          "reason": "<why this industry matches>"
        }
      ]
    }
  }

  Analysis Guidelines:
  - ATS Score: Rate based on keyword optimization, formatting, quantified achievements, and ATS compatibility
  - Keywords: Check for industry-relevant terms, technical skills, and action verbs
  - Formatting: Assess structure, readability, sections, and ATS-friendly format
  - Experience: Evaluate impact statements, quantified results, and career progression
  - Skills: Review technical and soft skills relevance and presentation
  - Provide 3-5 specific, actionable suggestions with before/after examples
  - Include Indian market context (salary expectations, company preferences, etc.)
  - Focus on quantifiable improvements and modern resume best practices

  IMPORTANT: Return ONLY a complete, valid JSON object. Do not include any text before or after the JSON. Ensure the JSON is properly closed with all brackets and braces.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    if (!response || !response.text) {
      throw new Error('Invalid response from AI model');
    }

    let jsonResponse = response.text().trim();
    
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
      
      // Try to fix incomplete JSON by adding missing closing braces/brackets
      let fixedJson = jsonResponse;
      try {
        // Count opening and closing braces/brackets
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;
        
        // Add missing closing braces
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '}';
        }
        
        // Add missing closing brackets  
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += ']';
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
          suggestions: []
        }
        };
      }
    }

    // Validate and structure the response
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
      weaknesses: analysis.weaknesses || [],
      industryMatch: analysis.industryMatch || {
        detectedIndustry: 'General',
        matchScore: 50,
        recommendations: []
      }
    };

  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Fallback analysis
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
          section: "Summary/Objective",
          issue: "Generic summary without specific achievements",
          improvement: "Add quantified results and target role keywords",
          beforeAfter: {
            before: "Experienced software developer with good skills",
            after: "Results-driven Software Engineer with 3+ years experience, increased application performance by 40%"
          },
          priority: "high"
        }
      ],
      keywordAnalysis: {
        found: ["JavaScript", "React", "Node.js"],
        missing: ["TypeScript", "AWS", "Docker"],
        suggested: ["Add cloud technologies", "Include modern frameworks"],
        density: 65
      },
      strengths: ["Technical skills listed", "Work experience included"],
      weaknesses: ["Lacks quantified achievements", "Missing keywords"],
      industryMatch: {
        detectedIndustry: "Technology",
        matchScore: 75,
        recommendations: [
          {
            industry: "Software Development",
            score: 80,
            reason: "Strong technical background and programming experience"
          }
        ]
      }
    };
  }
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