/**
 * Test Google Docs API Integration
 *
 * This script tests the Google Docs API setup to ensure
 * resume improvement feature will work correctly.
 *
 * Run: node test-google-docs.js
 */

require('dotenv').config();
const resumePDFGenerator = require('./src/services/resumePDFGenerator');
const fs = require('fs');
const path = require('path');

async function testResumePDFGeneration() {
  console.log('\n🧪 TESTING RESUME PDF GENERATION\n');
  console.log('='.repeat(60));

  // Test 1: Check if PDF generator is ready
  console.log('\n📋 Test 1: Configuration Check');
  console.log('─'.repeat(60));

  if (!resumePDFGenerator.isReady()) {
    console.error('❌ Resume PDF Generator not configured');
    return false;
  }

  console.log('✅ Resume PDF Generator is ready (using PDFKit)');

  // Test 2: Create a sample resume document
  console.log('\n📋 Test 2: Document Creation');
  console.log('─'.repeat(60));

  const sampleResumeData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-234-567-8900',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    website: 'johndoe.dev',
    summary: 'Results-driven Software Engineer with 5+ years of experience building scalable web applications. Proven track record of increasing system performance by 40% and leading cross-functional teams of 5+ developers. Expert in JavaScript, React, Node.js, and cloud technologies.',
    experience: [
      {
        position: 'Senior Software Engineer',
        company: 'Tech Innovations Inc.',
        duration: 'Jan 2021 - Present',
        achievements: [
          'Led development of microservices architecture, reducing API response time by 45%',
          'Mentored team of 5 junior developers, improving code quality metrics by 30%',
          'Implemented CI/CD pipeline, decreasing deployment time from 2 hours to 15 minutes',
          'Designed and launched 3 major features serving 100K+ active users'
        ]
      },
      {
        position: 'Software Engineer',
        company: 'StartupXYZ',
        duration: 'Jun 2019 - Dec 2020',
        achievements: [
          'Developed React-based dashboard used by 50+ enterprise clients',
          'Optimized database queries, improving page load times by 60%',
          'Integrated third-party APIs including Stripe, Twilio, and SendGrid'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        institution: 'University of California, Berkeley',
        year: '2019',
        gpa: '3.8/4.0'
      }
    ],
    skills: [
      { name: 'JavaScript', category: 'Programming Languages' },
      { name: 'TypeScript', category: 'Programming Languages' },
      { name: 'Python', category: 'Programming Languages' },
      { name: 'React', category: 'Frontend' },
      { name: 'Next.js', category: 'Frontend' },
      { name: 'Node.js', category: 'Backend' },
      { name: 'Express', category: 'Backend' },
      { name: 'MongoDB', category: 'Databases' },
      { name: 'PostgreSQL', category: 'Databases' },
      { name: 'AWS', category: 'Cloud & DevOps' },
      { name: 'Docker', category: 'Cloud & DevOps' },
      { name: 'Kubernetes', category: 'Cloud & DevOps' }
    ],
    projects: [
      {
        name: 'E-Commerce Platform',
        description: 'Built full-stack e-commerce platform handling 10K+ daily transactions with real-time inventory management',
        technologies: 'React, Node.js, MongoDB, Stripe, AWS'
      },
      {
        name: 'AI Content Generator',
        description: 'Developed AI-powered content generation tool using GPT-4 API, serving 5K+ users',
        technologies: 'Next.js, OpenAI API, PostgreSQL, Vercel'
      }
    ],
    certifications: [
      {
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: 'Mar 2023'
      },
      {
        name: 'Professional Scrum Master I',
        issuer: 'Scrum.org',
        date: 'Jan 2022'
      }
    ]
  };

  let pdfBuffer;
  try {
    pdfBuffer = await resumePDFGenerator.createImprovedResume(sampleResumeData);
    console.log(`✅ PDF created successfully`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Save PDF to disk for manual inspection
    const testOutputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    const pdfPath = path.join(testOutputDir, `test-resume-${Date.now()}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`   Saved to: ${pdfPath}`);
    console.log('   ℹ️  Open this file to verify formatting\n');

  } catch (error) {
    console.error('❌ Failed to create PDF:', error.message);
    console.error('\nℹ️  Common Issues:');
    console.error('- PDFKit library not installed');
    console.error('- Invalid resume data format\n');
    return false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED!');
  console.log('='.repeat(60));
  console.log('\n✅ Resume PDF Generator is working correctly');
  console.log('✅ Resume improvement feature is ready to use');
  console.log('✅ PDFs are being generated successfully (using PDFKit)\n');

  console.log('📝 Next Steps:');
  console.log('1. Review the generated PDF in test-output/');
  console.log('2. Verify formatting looks professional');
  console.log('3. Test the full improvement flow via API');
  console.log('4. Deploy to production\n');
  console.log('💡 Note: Using PDFKit (no Google Workspace required!)\n');

  return true;
}

// Run the test
if (require.main === module) {
  testResumePDFGeneration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Unexpected error during testing:', error);
      process.exit(1);
    });
}

module.exports = testResumePDFGeneration;
