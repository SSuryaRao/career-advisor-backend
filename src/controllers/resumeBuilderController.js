const User = require('../models/User');
const vertexAI = require('../services/vertexAI');
const resumePDFGenerator = require('../services/resumePDFGenerator');
const firebaseStorage = require('../services/firebaseStorage');

/**
 * Generate professional summary using AI
 */
const generateProfessionalSummary = async (req, res) => {
  const startTime = Date.now();

  try {
    const { uid: userId } = req.user;
    const resumeData = req.body;

    console.log('🤖 Generating professional summary for user:', userId);

    // Get user profile for additional context with timeout
    let user;
    try {
      user = await Promise.race([
        User.findByFirebaseUid(userId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User lookup timeout')), 5000)
        )
      ]);
    } catch (dbError) {
      console.error('❌ User lookup failed:', dbError.message);
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable',
        error: dbError.message
      });
    }

    if (!user) {
      console.warn('⚠️ User profile not found for:', userId);
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Build context for AI
    const context = {
      name: resumeData.name || user.name,
      title: user.profile?.title || '',
      bio: user.profile?.bio || '',
      skills: resumeData.skills || {},
      workExperience: resumeData.workExperience || [],
      projects: resumeData.projects || [],
      education: resumeData.education || user.profile?.education || '',
      careerGoal: user.profile?.careerGoal || ''
    };

    // Create prompt for AI
    const prompt = `Generate a concise professional resume summary for this person (maximum 80-100 words, 3-4 sentences):

Name: ${context.name}
${context.title ? `Current Title: ${context.title}` : ''}
${context.bio ? `Bio: ${context.bio}` : ''}
${context.education ? `Education: ${context.education}` : ''}
${context.careerGoal ? `Career Goal: ${context.careerGoal}` : ''}

Skills:
${context.skills.frontend?.length ? `Frontend: ${context.skills.frontend.join(', ')}` : ''}
${context.skills.backend?.length ? `Backend: ${context.skills.backend.join(', ')}` : ''}
${context.skills.languages?.length ? `Languages: ${context.skills.languages.join(', ')}` : ''}

${context.workExperience.length > 0 ? `Work Experience:
${context.workExperience.map(exp => `- ${exp.position} at ${exp.company}`).join('\n')}` : ''}

${context.projects.length > 0 ? `Key Projects:
${context.projects.slice(0, 2).map(proj => `- ${proj.name}: ${proj.technologies}`).join('\n')}` : ''}

Write a compelling professional summary that:
1. Is EXACTLY 3-4 sentences (maximum 100 words)
2. Highlights key technical skills and expertise
3. Showcases career achievements or potential
4. Uses strong, professional language
5. Is ATS-optimized with relevant keywords
6. Fits perfectly in one resume page

Return ONLY the summary text, no extra formatting or quotes.`;

    // Generate summary with Vertex AI with timeout protection (20 seconds)
    let summary;
    try {
      summary = await Promise.race([
        vertexAI.generateContent(prompt, 2, {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9,
          topK: 40
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout after 20 seconds')), 20000)
        )
      ]);

      console.log(`✅ Professional summary generated successfully in ${Date.now() - startTime}ms`);
    } catch (aiError) {
      console.error('❌ AI summary generation failed:', aiError.message);
      return res.status(503).json({
        success: false,
        message: 'AI service temporarily unavailable. Please try again.',
        error: aiError.message,
        timeMs: Date.now() - startTime
      });
    }

    res.json({
      success: true,
      summary: summary.trim(),
      timeMs: Date.now() - startTime
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ Error generating professional summary after ${errorTime}ms:`, error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to generate professional summary',
      error: error.message,
      timeMs: errorTime
    });
  }
};

/**
 * Create resume PDF from user profile and form data
 */
const createResumeFromProfile = async (req, res) => {
  const startTime = Date.now();

  try {
    const { uid: userId } = req.user;
    const { templateId = 'professional', ...resumeData } = req.body;

    console.log('📝 Creating resume for user:', userId, 'with template:', templateId);
    console.log('📊 Resume data received:', {
      name: resumeData.name,
      email: resumeData.email,
      workExpCount: resumeData.workExperience?.length || 0,
      projectsCount: resumeData.projects?.length || 0,
      skillsCount: Object.keys(resumeData.skills || {}).length
    });

    // Validation
    if (!resumeData.name || !resumeData.email) {
      console.error('❌ Validation failed: Missing name or email');
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
        details: {
          name: resumeData.name ? 'provided' : 'missing',
          email: resumeData.email ? 'provided' : 'missing'
        }
      });
    }

    if (!resumeData.workExperience || resumeData.workExperience.length === 0) {
      console.error('❌ Validation failed: Missing work experience');
      return res.status(400).json({
        success: false,
        message: 'At least one work experience is required'
      });
    }

    // Prepare data for PDF generation with safety checks
    const pdfData = {
      // Contact Info
      name: resumeData.name || 'Unknown',
      email: resumeData.email || '',
      phone: resumeData.phone || '',
      location: resumeData.location || '',
      linkedin: resumeData.linkedin || '',
      github: resumeData.github || '',
      website: resumeData.website || '',

      // Professional Summary
      summary: resumeData.professionalSummary || '',

      // Education - with null safety
      education: resumeData.education ? [
        {
          degree: resumeData.education,
          institution: '',
          year: ''
        }
      ] : [],

      // Work Experience - with null/undefined safety
      experience: Array.isArray(resumeData.workExperience)
        ? resumeData.workExperience.map(exp => ({
            company: exp.company || 'Company',
            position: exp.position || 'Position',
            duration: exp.current
              ? `${exp.startDate || 'Start'} - Present`
              : `${exp.startDate || 'Start'} - ${exp.endDate || 'End'}`,
            achievements: Array.isArray(exp.achievements)
              ? exp.achievements.filter(a => a && a.trim() !== '')
              : []
          }))
        : [],

      // Projects - with null/undefined safety
      projects: Array.isArray(resumeData.projects)
        ? resumeData.projects.map(proj => ({
            name: proj.name || 'Project',
            link: proj.link || '',
            technologies: proj.technologies || '',
            description: Array.isArray(proj.description)
              ? proj.description.filter(d => d && d.trim() !== '')
              : []
          }))
        : [],

      // Skills
      skills: [],

      // Extra-curricular - with null/undefined safety
      extraCurricular: Array.isArray(resumeData.extraCurricular)
        ? resumeData.extraCurricular.filter(item => item && item.trim() !== '')
        : []
    };

    // Format skills by category with null safety
    const skillCategories = [];
    const skills = resumeData.skills || {};

    if (Array.isArray(skills.frontend) && skills.frontend.length) {
      skillCategories.push({ category: 'Frontend', skills: skills.frontend.filter(s => s) });
    }
    if (Array.isArray(skills.backend) && skills.backend.length) {
      skillCategories.push({ category: 'Backend', skills: skills.backend.filter(s => s) });
    }
    if (Array.isArray(skills.database) && skills.database.length) {
      skillCategories.push({ category: 'Database', skills: skills.database.filter(s => s) });
    }
    if (Array.isArray(skills.languages) && skills.languages.length) {
      skillCategories.push({ category: 'Languages', skills: skills.languages.filter(s => s) });
    }
    if (Array.isArray(skills.softSkills) && skills.softSkills.length) {
      skillCategories.push({ category: 'Soft Skills', skills: skills.softSkills.filter(s => s) });
    }

    pdfData.skills = skillCategories;

    console.log('✅ Resume data prepared:', {
      experienceCount: pdfData.experience.length,
      projectsCount: pdfData.projects.length,
      skillCategories: pdfData.skills.length,
      extraCurricularCount: pdfData.extraCurricular.length
    });

    console.log('🔨 Generating PDF with resume data and template:', templateId);

    // Generate PDF with timeout protection (30 seconds)
    let pdfBuffer;
    try {
      pdfBuffer = await Promise.race([
        resumePDFGenerator.createResumePDF(pdfData, templateId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF generation timeout after 30 seconds')), 30000)
        )
      ]);

      console.log(`✅ PDF generated successfully in ${Date.now() - startTime}ms (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError.message);
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    }

    console.log('📤 Uploading PDF to Firebase Storage...');

    // Upload to Firebase Storage with timeout protection (60 seconds)
    let uploadResult;
    try {
      const fileName = `${resumeData.name.replace(/\s+/g, '_')}_Resume_${Date.now()}.pdf`;

      uploadResult = await Promise.race([
        firebaseStorage.uploadResume(pdfBuffer, fileName, userId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firebase upload timeout after 60 seconds')), 60000)
        )
      ]);

      console.log(`✅ Resume uploaded successfully in ${Date.now() - startTime}ms total`);
      console.log('📦 Download URL:', uploadResult.firebaseUrl);

      res.json({
        success: true,
        message: 'Resume created successfully!',
        downloadUrl: uploadResult.firebaseUrl,
        fileName: fileName,
        timeMs: Date.now() - startTime
      });
    } catch (uploadError) {
      console.error('❌ Firebase upload failed:', uploadError.message);
      throw new Error(`Firebase upload failed: ${uploadError.message}`);
    }

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ Error creating resume after ${errorTime}ms:`, {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });

    // Determine specific error type and return appropriate status code
    if (error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        message: 'Resume generation timeout. Please try again.',
        error: error.message,
        timeMs: errorTime
      });
    }

    if (error.message.includes('Firebase') || error.message.includes('storage')) {
      return res.status(503).json({
        success: false,
        message: 'Storage service temporarily unavailable. Please try again.',
        error: error.message,
        timeMs: errorTime
      });
    }

    if (error.message.includes('PDF generation')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PDF. Please check your resume data.',
        error: error.message,
        timeMs: errorTime
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Failed to create resume. Please try again.',
      error: error.message,
      timeMs: errorTime
    });
  }
};

module.exports = {
  generateProfessionalSummary,
  createResumeFromProfile
};
