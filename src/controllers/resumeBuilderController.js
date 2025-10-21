const User = require('../models/User');
const vertexAI = require('../services/vertexAI');
const resumePDFGenerator = require('../services/resumePDFGenerator');
const firebaseStorage = require('../services/firebaseStorage');

/**
 * Generate professional summary using AI
 */
const generateProfessionalSummary = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const resumeData = req.body;

    console.log('🤖 Generating professional summary for user:', userId);

    // Get user profile for additional context
    const user = await User.findByFirebaseUid(userId);

    if (!user) {
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
    const prompt = `Generate a professional resume summary (3-4 sentences) for this person:

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
1. Highlights key technical skills and expertise
2. Showcases career achievements or potential
3. Aligns with their career goals
4. Uses strong, professional language
5. Is ATS-optimized with relevant keywords
6. Focuses on value and impact

Return ONLY the summary text, no extra formatting or quotes.`;

    // Generate summary with Vertex AI
    const summary = await vertexAI.generateContent(prompt, 2, {
      temperature: 0.7,
      maxOutputTokens: 300,
      topP: 0.9
    });

    console.log('✅ Professional summary generated successfully');

    res.json({
      success: true,
      summary: summary.trim()
    });

  } catch (error) {
    console.error('❌ Error generating professional summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate professional summary',
      error: error.message
    });
  }
};

/**
 * Create resume PDF from user profile and form data
 */
const createResumeFromProfile = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { templateId = 'professional', ...resumeData } = req.body;

    console.log('📝 Creating resume for user:', userId, 'with template:', templateId);

    // Validation
    if (!resumeData.name || !resumeData.email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    if (!resumeData.workExperience || resumeData.workExperience.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one work experience is required'
      });
    }

    // Prepare data for PDF generation
    const pdfData = {
      // Contact Info
      name: resumeData.name,
      email: resumeData.email,
      phone: resumeData.phone || '',
      location: resumeData.location || '',
      linkedin: resumeData.linkedin || '',
      github: resumeData.github || '',
      website: resumeData.website || '',

      // Professional Summary
      summary: resumeData.professionalSummary || '',

      // Education
      education: resumeData.education ? [
        {
          degree: resumeData.education,
          institution: '',
          year: ''
        }
      ] : [],

      // Work Experience
      experience: resumeData.workExperience.map(exp => ({
        company: exp.company,
        position: exp.position,
        duration: exp.current
          ? `${exp.startDate} - Present`
          : `${exp.startDate} - ${exp.endDate}`,
        achievements: exp.achievements.filter(a => a.trim() !== '')
      })),

      // Projects
      projects: resumeData.projects.map(proj => ({
        name: proj.name,
        link: proj.link || '',
        technologies: proj.technologies,
        description: proj.description.filter(d => d.trim() !== '')
      })),

      // Skills
      skills: [],

      // Extra-curricular
      extraCurricular: resumeData.extraCurricular.filter(item => item.trim() !== '')
    };

    // Format skills by category
    const skillCategories = [];
    if (resumeData.skills.frontend?.length) {
      skillCategories.push({ category: 'Frontend', skills: resumeData.skills.frontend });
    }
    if (resumeData.skills.backend?.length) {
      skillCategories.push({ category: 'Backend', skills: resumeData.skills.backend });
    }
    if (resumeData.skills.database?.length) {
      skillCategories.push({ category: 'Database', skills: resumeData.skills.database });
    }
    if (resumeData.skills.languages?.length) {
      skillCategories.push({ category: 'Languages', skills: resumeData.skills.languages });
    }
    if (resumeData.skills.softSkills?.length) {
      skillCategories.push({ category: 'Soft Skills', skills: resumeData.skills.softSkills });
    }

    pdfData.skills = skillCategories;

    console.log('🔨 Generating PDF with resume data and template:', templateId);

    // Generate PDF using the resume PDF generator service with selected template
    const pdfBuffer = await resumePDFGenerator.createResumePDF(pdfData, templateId);

    console.log('📤 Uploading PDF to Firebase Storage...');

    // Upload to Firebase Storage
    const fileName = `${resumeData.name.replace(/\s+/g, '_')}_Resume_${Date.now()}.pdf`;
    const uploadResult = await firebaseStorage.uploadResume(
      pdfBuffer,
      fileName,
      userId
    );

    console.log('✅ Resume created and uploaded successfully');

    res.json({
      success: true,
      message: 'Resume created successfully!',
      downloadUrl: uploadResult.firebaseUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resume',
      error: error.message
    });
  }
};

module.exports = {
  generateProfessionalSummary,
  createResumeFromProfile
};
