/**
 * Resume PDF Generator Service
 *
 * Provides functionality to create professional resumes using PDFKit
 * No Google Workspace required - works with any Google Cloud project
 */

const PDFDocument = require('pdfkit');

class ResumePDFService {
  constructor() {
    this.isConfigured = true;
    console.log('✅ Resume PDF Generator initialized successfully (using PDFKit)');
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Create an improved resume PDF from analysis suggestions
   *
   * @param {Object} improvedData - Structured resume data with improvements
   * @returns {Promise<Buffer>} PDF Buffer
   */
  async createImprovedResume(improvedData) {
    return new Promise((resolve, reject) => {
      try {
        console.log('📄 Creating improved resume PDF...');

        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: 50,
            bottom: 50,
            left: 72,
            right: 72
          }
        });

        // Collect PDF data in buffers
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`✅ Resume PDF created (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Build resume content
        this.buildResumePDF(doc, improvedData);

        // Finalize PDF
        doc.end();

      } catch (error) {
        console.error('❌ Error creating resume PDF:', error);
        reject(new Error(`Failed to create resume PDF: ${error.message}`));
      }
    });
  }

  /**
   * Build resume PDF with professional formatting
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildResumePDF(doc, data) {
    let y = doc.y;

    // 1. NAME (Large, Bold, Centered)
    if (data.name) {
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(data.name, {
          align: 'center'
        });
      doc.moveDown(0.3);
    }

    // 2. CONTACT INFO (Centered)
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(contactParts.join(' | '), {
          align: 'center'
        });
      doc.moveDown(0.2);
    }

    // 3. LINKS (LinkedIn, GitHub, Website)
    const links = [];
    if (data.linkedin) links.push(data.linkedin);
    if (data.github) links.push(data.github);
    if (data.website) links.push(data.website);

    if (links.length > 0) {
      doc
        .fontSize(9)
        .fillColor('#0066cc')
        .text(links.join(' | '), {
          align: 'center',
          link: data.linkedin || data.github || data.website
        });
      doc.fillColor('#000000'); // Reset to black
      doc.moveDown(0.8);
    }

    // Add horizontal line
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .stroke();
    doc.moveDown(0.5);

    // 4. PROFESSIONAL SUMMARY
    if (data.summary && data.summary.trim()) {
      this.addSection(doc, 'PROFESSIONAL SUMMARY');
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, {
          align: 'justify'
        });
      doc.moveDown(0.8);
    }

    // 5. WORK EXPERIENCE
    if (data.experience && data.experience.length > 0) {
      this.addSection(doc, 'WORK EXPERIENCE');

      data.experience.forEach((job, index) => {
        // Job Title (Bold) and Company
        if (job.position && job.company) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(job.position, { continued: true })
            .font('Helvetica')
            .text(` | ${job.company}`);
        }

        // Duration
        if (job.duration || (job.startDate && job.endDate)) {
          const duration = job.duration || `${job.startDate} - ${job.endDate}`;
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(duration);
          doc.fillColor('#000000');
        }

        doc.moveDown(0.3);

        // Achievements/Description
        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            doc
              .fontSize(10)
              .font('Helvetica')
              .text('• ' + achievement, {
                indent: 10,
                align: 'justify'
              });
            doc.moveDown(0.2);
          });
        } else if (job.description) {
          const descriptions = job.description.split('\n').filter(line => line.trim());
          descriptions.forEach(line => {
            doc
              .fontSize(10)
              .font('Helvetica')
              .text('• ' + line.trim(), {
                indent: 10,
                align: 'justify'
              });
            doc.moveDown(0.2);
          });
        }

        if (index < data.experience.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.5);
    }

    // 6. EDUCATION
    if (data.education && data.education.length > 0) {
      this.addSection(doc, 'EDUCATION');

      data.education.forEach((edu, index) => {
        if (edu.degree && edu.institution) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(edu.degree, { continued: true })
            .font('Helvetica')
            .text(` | ${edu.institution}`);
        }

        if (edu.year) {
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(edu.year);
          doc.fillColor('#000000');
        }

        if (edu.gpa) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(`GPA: ${edu.gpa}`);
        }

        if (index < data.education.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.5);
    }

    // 7. SKILLS
    if (data.skills && data.skills.length > 0) {
      this.addSection(doc, 'SKILLS');

      // Group skills by category
      const categorizedSkills = {};
      data.skills.forEach(skill => {
        const category = skill.category || 'Technical Skills';
        if (!categorizedSkills[category]) {
          categorizedSkills[category] = [];
        }
        const skillName = typeof skill === 'string' ? skill : skill.name;
        categorizedSkills[category].push(skillName);
      });

      Object.keys(categorizedSkills).forEach((category, index) => {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(category + ': ', { continued: true })
          .font('Helvetica')
          .text(categorizedSkills[category].join(', '));

        if (index < Object.keys(categorizedSkills).length - 1) {
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(0.5);
    }

    // 8. PROJECTS
    if (data.projects && data.projects.length > 0) {
      this.addSection(doc, 'PROJECTS');

      data.projects.forEach((project, index) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name, { continued: project.link ? true : false });

          if (project.link) {
            doc
              .fontSize(9)
              .fillColor('#0066cc')
              .text(` | ${project.link}`, {
                link: project.link
              });
            doc.fillColor('#000000');
          } else {
            doc.text(''); // New line
          }
        }

        if (project.description) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(project.description, {
              align: 'justify'
            });
        }

        if (project.technologies) {
          const techs = Array.isArray(project.technologies)
            ? project.technologies.join(', ')
            : project.technologies;
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text('Technologies: ' + techs);
          doc.fillColor('#000000');
        }

        if (index < data.projects.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.5);
    }

    // 9. CERTIFICATIONS
    if (data.certifications && data.certifications.length > 0) {
      this.addSection(doc, 'CERTIFICATIONS');

      data.certifications.forEach((cert, index) => {
        if (cert.name) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(cert.name, { continued: cert.issuer ? true : false });

          if (cert.issuer) {
            doc
              .font('Helvetica')
              .text(` - ${cert.issuer}`, { continued: cert.date ? true : false });

            if (cert.date) {
              doc
                .fontSize(9)
                .fillColor('#666666')
                .text(` (${cert.date})`);
              doc.fillColor('#000000');
            } else {
              doc.text(''); // New line
            }
          } else {
            doc.text(''); // New line
          }
        }

        if (index < data.certifications.length - 1) {
          doc.moveDown(0.3);
        }
      });
    }
  }

  /**
   * Add a section header
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {string} title - Section title
   */
  addSection(doc, title) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title);

    // Add underline
    doc
      .strokeColor('#333333')
      .lineWidth(1.5)
      .moveTo(72, doc.y + 2)
      .lineTo(540, doc.y + 2)
      .stroke();

    doc.moveDown(0.5);
  }

  /**
   * Create resume PDF from Resume Builder data
   * Supports multiple templates
   *
   * @param {Object} data - Resume data from builder
   * @param {string} templateId - Template to use (professional, modern, classic, creative)
   * @returns {Promise<Buffer>} PDF Buffer
   */
  async createResumePDF(data, templateId = 'professional') {
    return new Promise((resolve, reject) => {
      try {
        console.log(`📄 Creating resume PDF with ${templateId} template...`);

        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: 50,
            bottom: 50,
            left: 72,
            right: 72
          }
        });

        // Collect PDF data in buffers
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`✅ Resume PDF created (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Build resume content based on template
        switch (templateId) {
          case 'aditya':
            this.buildAdityaTemplate(doc, data);
            break;
          case 'arushi':
            this.buildArushiTemplate(doc, data);
            break;
          case 'hemant':
            this.buildHemantTemplate(doc, data);
            break;
          case 'datascience':
            this.buildDataScienceTemplate(doc, data);
            break;
          case 'mukesh':
            this.buildMukeshTemplate(doc, data);
            break;
          case 'prankush':
            this.buildPrankushTemplate(doc, data);
            break;
          case 'sameer':
          case 'sameer-alt':
            this.buildSameerTemplate(doc, data);
            break;
          case 'rishabh':
            this.buildRishabhTemplate(doc, data);
            break;
          // Legacy templates for backwards compatibility
          case 'modern':
            this.buildModernTemplate(doc, data);
            break;
          case 'classic':
            this.buildClassicTemplate(doc, data);
            break;
          case 'creative':
            this.buildCreativeTemplate(doc, data);
            break;
          case 'professional':
          default:
            this.buildProfessionalTemplate(doc, data);
            break;
        }

        // Finalize PDF
        doc.end();

      } catch (error) {
        console.error('❌ Error creating resume PDF:', error);
        reject(new Error(`Failed to create resume PDF: ${error.message}`));
      }
    });
  }

  /**
   * Build resume with professional template formatting
   * Based on Sameer Chauhan template style - Clean and professional
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildProfessionalTemplate(doc, data) {
    let y = doc.y;

    // 1. NAME (Large, Bold, Centered)
    if (data.name) {
      doc
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(data.name, {
          align: 'center'
        });
      doc.moveDown(0.4);
    }

    // 2. CONTACT INFO WITH ICONS (Centered)
    const contactParts = [];
    if (data.email) contactParts.push(`✉ ${data.email}`);
    if (data.phone) contactParts.push(`📱 ${data.phone}`);
    if (data.location) contactParts.push(`📍 ${data.location}`);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(contactParts.join('  |  '), {
          align: 'center'
        });
      doc.moveDown(0.2);
    }

    // 3. SOCIAL LINKS (Centered)
    const links = [];
    if (data.github) links.push(`GitHub: ${data.github}`);
    if (data.linkedin) links.push(`LinkedIn: ${data.linkedin}`);
    if (data.website) links.push(`Website: ${data.website}`);

    if (links.length > 0) {
      doc
        .fontSize(9)
        .fillColor('#0066cc')
        .text(links.join('  |  '), {
          align: 'center'
        });
      doc.fillColor('#000000'); // Reset to black
      doc.moveDown(1);
    }

    // 4. EDUCATION TABLE (if provided)
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      this.addSectionHeader(doc, 'EDUCATION');

      data.education.forEach((edu, index) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree, { continued: true })
            .font('Helvetica')
            .text(edu.institution ? ` - ${edu.institution}` : '');

          if (edu.year) {
            doc
              .fontSize(9)
              .fillColor('#666666')
              .text(edu.year);
            doc.fillColor('#000000');
          }

          if (index < data.education.length - 1) {
            doc.moveDown(0.3);
          }
        }
      });

      doc.moveDown(0.8);
    }

    // 5. PROFESSIONAL SUMMARY (if provided)
    if (data.summary && data.summary.trim()) {
      this.addSectionHeader(doc, 'PROFESSIONAL SUMMARY');
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, {
          align: 'justify'
        });
      doc.moveDown(0.8);
    }

    // 6. WORK EXPERIENCE
    if (data.experience && data.experience.length > 0) {
      this.addSectionHeader(doc, 'EXPERIENCE');

      data.experience.forEach((job, index) => {
        // Company name (Bold) and position with date on right
        if (job.company) {
          const leftText = job.company;
          const rightText = job.duration || '';

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(leftText, 72, doc.y, { continued: false });

          if (rightText) {
            doc
              .fontSize(10)
              .font('Helvetica-Oblique')
              .fillColor('#666666')
              .text(rightText, 72, doc.y - 11, { align: 'right', width: 468 });
            doc.fillColor('#000000');
          }
        }

        // Position (Italic)
        if (job.position) {
          doc
            .fontSize(10)
            .font('Helvetica-Oblique')
            .text(job.position);
        }

        doc.moveDown(0.3);

        // Achievements with ✦ bullet
        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text('✦ ' + achievement, {
                  indent: 5,
                  align: 'justify'
                });
              doc.moveDown(0.2);
            }
          });
        }

        if (index < data.experience.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.8);
    }

    // 7. PROJECTS
    if (data.projects && data.projects.length > 0) {
      this.addSectionHeader(doc, 'PROJECTS');

      data.projects.forEach((project, index) => {
        if (project.name) {
          // Project name (Bold) with link and technologies on right
          const leftText = `${project.name}${project.link ? ' — Link' : ''}`;
          const rightText = project.technologies || '';

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(leftText, 72, doc.y, { continued: false });

          if (rightText) {
            doc
              .fontSize(10)
              .font('Helvetica-Oblique')
              .fillColor('#666666')
              .text(rightText, 72, doc.y - 11, { align: 'right', width: 468 });
            doc.fillColor('#000000');
          }
        }

        doc.moveDown(0.3);

        // Project description with ✦ bullets
        if (project.description && project.description.length > 0) {
          project.description.forEach(desc => {
            if (desc.trim()) {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text('✦ ' + desc, {
                  indent: 5,
                  align: 'justify'
                });
              doc.moveDown(0.2);
            }
          });
        }

        if (index < data.projects.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.8);
    }

    // 8. SKILLS
    if (data.skills && data.skills.length > 0) {
      this.addSectionHeader(doc, 'SKILLS');

      data.skills.forEach((skillCategory, index) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category, { continued: true })
            .font('Helvetica')
            .text(`     ${skillCategory.skills.filter(s => s).join(', ')}`);

          if (index < data.skills.length - 1) {
            doc.moveDown(0.3);
          }
        }
      });

      doc.moveDown(0.8);
    }

    // 9. EXTRA-CURRICULAR & ACHIEVEMENTS
    if (data.extraCurricular && data.extraCurricular.length > 0) {
      this.addSectionHeader(doc, 'EXTRA-CURRICULAR & ACHIEVEMENTS');

      data.extraCurricular.forEach((item, index) => {
        if (item.trim()) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text('✦ ' + item, {
              indent: 5,
              align: 'justify'
            });

          if (index < data.extraCurricular.length - 1) {
            doc.moveDown(0.2);
          }
        }
      });
    }
  }

  /**
   * Build resume with modern template - Contemporary with accent colors
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildModernTemplate(doc, data) {
    const accentColor = '#2563eb'; // Blue accent

    // 1. NAME with colored background bar
    doc
      .rect(0, 30, 612, 80)
      .fillAndStroke(accentColor, accentColor);

    if (data.name) {
      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(data.name, 72, 55, {
          align: 'left'
        });
    }

    // Contact info in white on colored bar
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#e0e7ff')
        .text(contactParts.join(' • '), 72, 85, { align: 'left' });
    }

    doc.fillColor('#000000');
    doc.y = 130;

    // Professional Summary with colored header
    if (data.summary && data.summary.trim()) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('PROFESSIONAL SUMMARY');

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000000')
        .text(data.summary, { align: 'justify' });
      doc.moveDown(1);
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('EXPERIENCE');
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.experience.forEach((job, index) => {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(job.position || job.company, 72, doc.y, { continued: false });

        if (job.company && job.position) {
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#666666')
            .text(job.company + (job.duration ? ` | ${job.duration}` : ''));
          doc.fillColor('#000000');
        }

        doc.moveDown(0.3);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text('▸ ' + achievement, { indent: 5, align: 'justify' });
              doc.moveDown(0.2);
            }
          });
        }

        if (index < data.experience.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.8);
    }

    // Education
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('EDUCATION');
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(edu.degree);
          if (edu.institution) {
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor('#666666')
              .text(edu.institution + (edu.year ? ` | ${edu.year}` : ''));
            doc.fillColor('#000000');
          }
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(0.5);
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('SKILLS');
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category + ': ', { continued: true })
            .font('Helvetica')
            .text(skillCategory.skills.filter(s => s).join(', '));
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(0.5);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('PROJECTS');
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.projects.forEach((project, index) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name);

          if (project.technologies) {
            doc
              .fontSize(9)
              .fillColor('#666666')
              .text('Tech: ' + project.technologies);
            doc.fillColor('#000000');
          }

          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(10)
                  .font('Helvetica')
                  .text('▸ ' + desc, { indent: 5 });
                doc.moveDown(0.1);
              }
            });
          }

          if (index < data.projects.length - 1) {
            doc.moveDown(0.4);
          }
        }
      });
    }

    // Extra-curricular
    if (data.extraCurricular && data.extraCurricular.length > 0) {
      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(accentColor)
        .text('ACHIEVEMENTS');
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.extraCurricular.forEach((item) => {
        if (item.trim()) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text('▸ ' + item, { indent: 5 });
          doc.moveDown(0.2);
        }
      });
    }
  }

  /**
   * Build resume with classic template - Traditional and timeless
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildClassicTemplate(doc, data) {
    // 1. NAME (Centered, Large, Traditional)
    if (data.name) {
      doc
        .fontSize(20)
        .font('Times-Bold')
        .text(data.name.toUpperCase(), { align: 'center' });
      doc.moveDown(0.3);
    }

    // 2. Contact Info (Centered, Small)
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Times-Roman')
        .text(contactParts.join(' | '), { align: 'center' });
      doc.moveDown(0.2);
    }

    // Links
    const links = [];
    if (data.linkedin) links.push(data.linkedin);
    if (data.github) links.push(data.github);
    if (data.website) links.push(data.website);

    if (links.length > 0) {
      doc
        .fontSize(9)
        .text(links.join(' | '), { align: 'center' });
      doc.moveDown(0.8);
    }

    // Horizontal line
    doc
      .strokeColor('#000000')
      .lineWidth(2)
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .stroke();
    doc.moveDown(0.8);

    // Professional Summary
    if (data.summary && data.summary.trim()) {
      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('SUMMARY');
      doc.moveDown(0.3);

      doc
        .fontSize(11)
        .font('Times-Roman')
        .text(data.summary, { align: 'justify' });
      doc.moveDown(0.8);
    }

    // Education
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('EDUCATION');
      doc.moveDown(0.3);

      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(11)
            .font('Times-Bold')
            .text(edu.degree);
          if (edu.institution) {
            doc
              .font('Times-Italic')
              .text(edu.institution + (edu.year ? `, ${edu.year}` : ''));
          }
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(0.5);
    }

    // Professional Experience
    if (data.experience && data.experience.length > 0) {
      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('PROFESSIONAL EXPERIENCE');
      doc.moveDown(0.3);

      data.experience.forEach((job, index) => {
        if (job.position) {
          doc
            .fontSize(11)
            .font('Times-Bold')
            .text(job.position);
        }

        if (job.company) {
          doc
            .font('Times-Italic')
            .text(job.company + (job.duration ? ` (${job.duration})` : ''));
        }

        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .font('Times-Roman')
                .text('• ' + achievement, { indent: 10, align: 'justify' });
              doc.moveDown(0.15);
            }
          });
        }

        if (index < data.experience.length - 1) {
          doc.moveDown(0.5);
        }
      });

      doc.moveDown(0.8);
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('SKILLS');
      doc.moveDown(0.3);

      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Times-Bold')
            .text(skillCategory.category + ': ', { continued: true })
            .font('Times-Roman')
            .text(skillCategory.skills.filter(s => s).join(', '));
          doc.moveDown(0.2);
        }
      });

      doc.moveDown(0.5);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('PROJECTS');
      doc.moveDown(0.3);

      data.projects.forEach((project) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Times-Bold')
            .text(project.name);

          if (project.technologies) {
            doc
              .fontSize(9)
              .font('Times-Italic')
              .text('Technologies: ' + project.technologies);
          }

          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(10)
                  .font('Times-Roman')
                  .text('• ' + desc, { indent: 10 });
                doc.moveDown(0.15);
              }
            });
          }

          doc.moveDown(0.3);
        }
      });
    }

    // Achievements
    if (data.extraCurricular && data.extraCurricular.length > 0) {
      doc
        .fontSize(12)
        .font('Times-Bold')
        .text('ACHIEVEMENTS & ACTIVITIES');
      doc.moveDown(0.3);

      data.extraCurricular.forEach((item) => {
        if (item.trim()) {
          doc
            .fontSize(10)
            .font('Times-Roman')
            .text('• ' + item, { indent: 10 });
          doc.moveDown(0.15);
        }
      });
    }
  }

  /**
   * Build resume with creative template - Bold and unique
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildCreativeTemplate(doc, data) {
    const primaryColor = '#8b5cf6'; // Purple
    const secondaryColor = '#ec4899'; // Pink

    // 1. Gradient-style header (simulated with rectangle)
    doc
      .rect(0, 0, 612, 100)
      .fillAndStroke(primaryColor, primaryColor);

    // Name in white on colored background
    if (data.name) {
      doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(data.name, 72, 35, { align: 'left' });
    }

    // Contact info
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#e0e7ff')
        .text(contactParts.join(' ✦ '), 72, 75, { align: 'left' });
    }

    doc.fillColor('#000000');
    doc.y = 120;

    // Two-column layout start
    const leftColX = 72;
    const rightColX = 320;
    let leftY = doc.y;
    let rightY = doc.y;

    // LEFT COLUMN - Skills, Education
    doc.y = leftY;

    // Skills
    if (data.skills && data.skills.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('SKILLS', leftColX, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category, leftColX, doc.y);

          skillCategory.skills.filter(s => s).forEach(skill => {
            doc
              .fontSize(9)
              .font('Helvetica')
              .text('• ' + skill, leftColX + 5, doc.y);
            doc.moveDown(0.2);
          });

          doc.moveDown(0.3);
        }
      });

      leftY = doc.y + 20;
    }

    // Education in left column
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      doc.y = leftY;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('EDUCATION', leftColX, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree, leftColX, doc.y, { width: 230 });
          if (edu.institution) {
            doc
              .fontSize(9)
              .font('Helvetica')
              .text(edu.institution, leftColX, doc.y, { width: 230 });
          }
          if (edu.year) {
            doc
              .fontSize(8)
              .fillColor('#666666')
              .text(edu.year, leftColX, doc.y);
            doc.fillColor('#000000');
          }
          doc.moveDown(0.5);
        }
      });
    }

    // RIGHT COLUMN - Experience, Projects
    doc.y = rightY;

    // Professional Summary
    if (data.summary && data.summary.trim()) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(secondaryColor)
        .text('ABOUT ME', rightColX, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, rightColX, doc.y, { width: 220, align: 'justify' });
      doc.moveDown(0.8);
    }

    // Experience
    if (data.experience && data.experience.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(secondaryColor)
        .text('EXPERIENCE', rightColX, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.experience.forEach((job) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(job.position || job.company, rightColX, doc.y, { width: 220 });

        if (job.company && job.position) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#666666')
            .text(job.company + ' | ' + (job.duration || ''), rightColX, doc.y, { width: 220 });
          doc.fillColor('#000000');
        }

        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.slice(0, 3).forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(9)
                .font('Helvetica')
                .text('✦ ' + achievement, rightColX, doc.y, { width: 220 });
              doc.moveDown(0.15);
            }
          });
        }

        doc.moveDown(0.5);
      });
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(secondaryColor)
        .text('PROJECTS', rightColX, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.projects.forEach((project) => {
        if (project.name) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(project.name, rightColX, doc.y, { width: 220 });

          if (project.technologies) {
            doc
              .fontSize(8)
              .fillColor('#666666')
              .text(project.technologies, rightColX, doc.y, { width: 220 });
            doc.fillColor('#000000');
          }

          doc.moveDown(0.3);
        }
      });
    }

    // Extra-curricular at bottom
    if (data.extraCurricular && data.extraCurricular.length > 0) {
      // Move to bottom section
      doc.y = Math.max(leftY, rightY) + 20;

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('ACHIEVEMENTS', 72, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      data.extraCurricular.forEach((item) => {
        if (item.trim()) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .text('✦ ' + item, 72, doc.y, { width: 468 });
          doc.moveDown(0.2);
        }
      });
    }
  }

  /**
   * Build resume with Aditya template - Clean professional with centered name
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildAdityaTemplate(doc, data) {
    // 1. NAME (Centered, Bold)
    if (data.name) {
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(data.name, { align: 'center' });
      doc.moveDown(0.3);
    }

    // 2. CONTACT INFO (Centered)
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(contactParts.join(' | '), { align: 'center' });
      doc.moveDown(0.2);
    }

    // Links
    const links = [];
    if (data.linkedin) links.push(data.linkedin);
    if (data.github) links.push(data.github);
    if (data.website) links.push(data.website);

    if (links.length > 0) {
      doc
        .fontSize(9)
        .fillColor('#0066cc')
        .text(links.join(' | '), { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(1);
    }

    // Professional Summary
    if (data.summary && data.summary.trim()) {
      this.addUnderlinedSection(doc, 'PROFESSIONAL SUMMARY');
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, { align: 'justify' });
      doc.moveDown(0.8);
    }

    // Education
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      this.addUnderlinedSection(doc, 'EDUCATION');
      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree + (edu.institution ? ` - ${edu.institution}` : ''));
          if (edu.year) {
            doc
              .fontSize(9)
              .font('Helvetica')
              .text(edu.year);
          }
          doc.moveDown(0.3);
        }
      });
      doc.moveDown(0.5);
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      this.addUnderlinedSection(doc, 'WORK EXPERIENCE');
      data.experience.forEach((job, index) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(job.position || job.company);
        if (job.company && job.position) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(job.company + (job.duration ? ` | ${job.duration}` : ''));
        }
        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text('• ' + achievement, { indent: 10, align: 'justify' });
              doc.moveDown(0.15);
            }
          });
        }

        if (index < data.experience.length - 1) {
          doc.moveDown(0.5);
        }
      });
      doc.moveDown(0.8);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      this.addUnderlinedSection(doc, 'PROJECTS');
      data.projects.forEach((project, index) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name + (project.technologies ? ` | ${project.technologies}` : ''));
          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(10)
                  .font('Helvetica')
                  .text('• ' + desc, { indent: 10 });
                doc.moveDown(0.15);
              }
            });
          }

          if (index < data.projects.length - 1) {
            doc.moveDown(0.4);
          }
        }
      });
      doc.moveDown(0.8);
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      this.addUnderlinedSection(doc, 'SKILLS');
      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category + ': ', { continued: true })
            .font('Helvetica')
            .text(skillCategory.skills.filter(s => s).join(', '));
          doc.moveDown(0.2);
        }
      });
      doc.moveDown(0.5);
    }

    // Extra-curricular
    if (data.extraCurricular && data.extraCurricular.length > 0) {
      this.addUnderlinedSection(doc, 'EXTRA-CURRICULAR');
      data.extraCurricular.forEach((item) => {
        if (item.trim()) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text('• ' + item, { indent: 10 });
          doc.moveDown(0.15);
        }
      });
    }
  }

  /**
   * Build resume with Arushi template - Blue horizontal lines
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildArushiTemplate(doc, data) {
    const blueColor = '#0066CC';

    // 1. NAME (Centered)
    if (data.name) {
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(data.name, { align: 'center' });
      doc.moveDown(0.2);
    }

    // Subtitle if available
    if (data.summary && data.summary.length < 50) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666666')
        .text(data.summary, { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.3);
    }

    // Contact info
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(contactParts.join(' | '), { align: 'center' });
      doc.moveDown(1);
    }

    // Helper function for blue line sections
    const addBlueLineSection = (title) => {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(title, { align: 'left' });
      doc
        .strokeColor(blueColor)
        .lineWidth(2)
        .moveTo(72, doc.y + 2)
        .lineTo(540, doc.y + 2)
        .stroke();
      doc.moveDown(0.5);
    };

    // Professional Summary (if long)
    if (data.summary && data.summary.length >= 50) {
      addBlueLineSection('PROFESSIONAL SUMMARY');
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, { align: 'justify' });
      doc.moveDown(0.8);
    }

    // Education
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      addBlueLineSection('EDUCATION');
      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree + (edu.institution ? ` - ${edu.institution}` : ''));
          if (edu.year) {
            doc.fontSize(9).font('Helvetica').text(edu.year);
          }
          doc.moveDown(0.3);
        }
      });
      doc.moveDown(0.5);
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      addBlueLineSection('WORK EXPERIENCE');
      data.experience.forEach((job) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(job.position || job.company);
        if (job.company && job.position) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(job.company + (job.duration ? ` | ${job.duration}` : ''));
        }
        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .text('• ' + achievement, { indent: 10, align: 'justify' });
              doc.moveDown(0.15);
            }
          });
        }
        doc.moveDown(0.4);
      });
      doc.moveDown(0.4);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      addBlueLineSection('PROJECTS');
      data.projects.forEach((project) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name);
          if (project.technologies) {
            doc
              .fontSize(9)
              .fillColor('#666666')
              .text('Tech: ' + project.technologies);
            doc.fillColor('#000000');
          }
          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(10)
                  .font('Helvetica')
                  .text('• ' + desc, { indent: 10 });
                doc.moveDown(0.15);
              }
            });
          }
          doc.moveDown(0.4);
        }
      });
      doc.moveDown(0.4);
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      addBlueLineSection('SKILLS');
      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category + ': ', { continued: true })
            .font('Helvetica')
            .text(skillCategory.skills.filter(s => s).join(', '));
          doc.moveDown(0.2);
        }
      });
    }
  }

  /**
   * Build resume with Hemant template - Orange accent line
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildHemantTemplate(doc, data) {
    const orangeColor = '#FF6600';

    // 1. NAME (Left-aligned, Bold)
    if (data.name) {
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(data.name);

      // Orange accent line under name
      doc
        .strokeColor(orangeColor)
        .lineWidth(3)
        .moveTo(72, doc.y + 5)
        .lineTo(200, doc.y + 5)
        .stroke();
      doc.moveDown(0.5);
    }

    // Contact info
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(contactParts.join(' | '));
      doc.moveDown(0.8);
    }

    // Professional Summary
    if (data.summary && data.summary.trim()) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(orangeColor)
        .text('PROFESSIONAL SUMMARY');
      doc.fillColor('#000000');
      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, { align: 'justify' });
      doc.moveDown(0.8);
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(orangeColor)
        .text('EXPERIENCE');
      doc.fillColor('#000000');
      doc.moveDown(0.3);

      data.experience.forEach((job) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(job.position || job.company);
        if (job.company && job.position) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(job.company + (job.duration ? ` | ${job.duration}` : ''));
        }
        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .text('• ' + achievement, { indent: 10, align: 'justify' });
              doc.moveDown(0.15);
            }
          });
        }
        doc.moveDown(0.4);
      });
      doc.moveDown(0.4);
    }

    // Education
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(orangeColor)
        .text('EDUCATION');
      doc.fillColor('#000000');
      doc.moveDown(0.3);

      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree);
          if (edu.institution) {
            doc
              .fontSize(10)
              .font('Helvetica')
              .text(edu.institution + (edu.year ? ` | ${edu.year}` : ''));
          }
          doc.moveDown(0.3);
        }
      });
      doc.moveDown(0.5);
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(orangeColor)
        .text('SKILLS');
      doc.fillColor('#000000');
      doc.moveDown(0.3);

      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category + ': ', { continued: true })
            .font('Helvetica')
            .text(skillCategory.skills.filter(s => s).join(', '));
          doc.moveDown(0.2);
        }
      });
      doc.moveDown(0.5);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(orangeColor)
        .text('PROJECTS');
      doc.fillColor('#000000');
      doc.moveDown(0.3);

      data.projects.forEach((project) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name);
          if (project.technologies) {
            doc
              .fontSize(9)
              .fillColor('#666666')
              .text(project.technologies);
            doc.fillColor('#000000');
          }
          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(10)
                  .font('Helvetica')
                  .text('• ' + desc, { indent: 10 });
                doc.moveDown(0.15);
              }
            });
          }
          doc.moveDown(0.4);
        }
      });
    }
  }

  /**
   * Build resume with Data Science template - Two-column layout
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildDataScienceTemplate(doc, data) {
    const leftColX = 72;
    const leftColWidth = 180;
    const rightColX = 270;
    const rightColWidth = 270;

    let leftY = 50;
    let rightY = 50;

    // LEFT COLUMN - Contact & Skills
    doc.y = leftY;

    // Name
    if (data.name) {
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(data.name, leftColX, doc.y, { width: leftColWidth });
      doc.moveDown(0.5);
    }

    // Contact info
    doc.fontSize(9).font('Helvetica');
    if (data.email) {
      doc.text('Email: ' + data.email, leftColX, doc.y, { width: leftColWidth });
    }
    if (data.phone) {
      doc.text('Phone: ' + data.phone, leftColX, doc.y, { width: leftColWidth });
    }
    if (data.location) {
      doc.text('Location: ' + data.location, leftColX, doc.y, { width: leftColWidth });
    }
    if (data.linkedin) {
      doc.text('LinkedIn: ' + data.linkedin, leftColX, doc.y, { width: leftColWidth });
    }
    if (data.github) {
      doc.text('GitHub: ' + data.github, leftColX, doc.y, { width: leftColWidth });
    }
    doc.moveDown(1);

    // Skills in left column
    if (data.skills && data.skills.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('SKILLS', leftColX, doc.y, { width: leftColWidth });
      doc.moveDown(0.3);

      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category, leftColX, doc.y, { width: leftColWidth });

          skillCategory.skills.filter(s => s).forEach(skill => {
            doc
              .fontSize(9)
              .font('Helvetica')
              .text('• ' + skill, leftColX + 5, doc.y, { width: leftColWidth - 5 });
            doc.moveDown(0.15);
          });
          doc.moveDown(0.3);
        }
      });
    }

    // Education in left column
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EDUCATION', leftColX, doc.y, { width: leftColWidth });
      doc.moveDown(0.3);

      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree, leftColX, doc.y, { width: leftColWidth });
          if (edu.institution) {
            doc
              .fontSize(9)
              .font('Helvetica')
              .text(edu.institution, leftColX, doc.y, { width: leftColWidth });
          }
          if (edu.year) {
            doc
              .fontSize(9)
              .text(edu.year, leftColX, doc.y, { width: leftColWidth });
          }
          doc.moveDown(0.4);
        }
      });
    }

    // RIGHT COLUMN - Experience & Projects
    doc.y = rightY;

    // Professional Summary
    if (data.summary && data.summary.trim()) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PROFESSIONAL SUMMARY', rightColX, doc.y, { width: rightColWidth });
      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, rightColX, doc.y, { width: rightColWidth, align: 'justify' });
      doc.moveDown(0.8);
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EXPERIENCE', rightColX, doc.y, { width: rightColWidth });
      doc.moveDown(0.3);

      data.experience.forEach((job) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(job.position || job.company, rightColX, doc.y, { width: rightColWidth });
        if (job.company && job.position) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#666666')
            .text(job.company + (job.duration ? ` | ${job.duration}` : ''), rightColX, doc.y, { width: rightColWidth });
          doc.fillColor('#000000');
        }
        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(9)
                .font('Helvetica')
                .text('• ' + achievement, rightColX, doc.y, { width: rightColWidth, indent: 5 });
              doc.moveDown(0.15);
            }
          });
        }
        doc.moveDown(0.4);
      });
      doc.moveDown(0.4);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PROJECTS', rightColX, doc.y, { width: rightColWidth });
      doc.moveDown(0.3);

      data.projects.forEach((project) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name, rightColX, doc.y, { width: rightColWidth });
          if (project.technologies) {
            doc
              .fontSize(9)
              .fillColor('#666666')
              .text('Tech: ' + project.technologies, rightColX, doc.y, { width: rightColWidth });
            doc.fillColor('#000000');
          }
          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(9)
                  .font('Helvetica')
                  .text('• ' + desc, rightColX, doc.y, { width: rightColWidth, indent: 5 });
                doc.moveDown(0.15);
              }
            });
          }
          doc.moveDown(0.4);
        }
      });
    }
  }

  /**
   * Build resume with Mukesh template - Social links prominent
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildMukeshTemplate(doc, data) {
    // Similar to Aditya but with more emphasis on links
    this.buildAdityaTemplate(doc, data);
  }

  /**
   * Build resume with Prankush template - Bold name with icons
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildPrankushTemplate(doc, data) {
    // NAME (Large, Bold, Left-aligned)
    if (data.name) {
      doc
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(data.name);
      doc.moveDown(0.3);
    }

    // Contact with email icon
    if (data.email) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('✉ ' + data.email);
    }
    if (data.phone) {
      doc.text('📞 ' + data.phone);
    }
    if (data.location) {
      doc.text('📍 ' + data.location);
    }
    doc.moveDown(0.5);

    // Horizontal line
    doc
      .strokeColor('#000000')
      .lineWidth(1)
      .moveTo(72, doc.y)
      .lineTo(540, doc.y)
      .stroke();
    doc.moveDown(0.5);

    // Professional Summary
    if (data.summary && data.summary.trim()) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PROFESSIONAL SUMMARY');
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.summary, { align: 'justify' });
      doc.moveDown(0.8);
    }

    // Reuse professional template for remaining sections
    if (data.experience && data.experience.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('WORK EXPERIENCE');
      doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(72, doc.y)
        .lineTo(540, doc.y)
        .stroke();
      doc.moveDown(0.5);

      data.experience.forEach((job) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(job.position || job.company);
        if (job.company && job.position) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(job.company + (job.duration ? ` | ${job.duration}` : ''));
        }
        doc.moveDown(0.2);

        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            if (achievement.trim()) {
              doc
                .fontSize(10)
                .text('• ' + achievement, { indent: 10, align: 'justify' });
              doc.moveDown(0.15);
            }
          });
        }
        doc.moveDown(0.4);
      });
      doc.moveDown(0.4);
    }

    // Education
    if (data.education && data.education.length > 0 && data.education[0].degree) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EDUCATION');
      doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(72, doc.y)
        .lineTo(540, doc.y)
        .stroke();
      doc.moveDown(0.5);

      data.education.forEach((edu) => {
        if (edu.degree) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(edu.degree + (edu.institution ? ` - ${edu.institution}` : ''));
          if (edu.year) {
            doc.fontSize(9).font('Helvetica').text(edu.year);
          }
          doc.moveDown(0.3);
        }
      });
      doc.moveDown(0.5);
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('SKILLS');
      doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(72, doc.y)
        .lineTo(540, doc.y)
        .stroke();
      doc.moveDown(0.5);

      data.skills.forEach((skillCategory) => {
        if (skillCategory.category && skillCategory.skills && skillCategory.skills.length > 0) {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(skillCategory.category + ': ', { continued: true })
            .font('Helvetica')
            .text(skillCategory.skills.filter(s => s).join(', '));
          doc.moveDown(0.2);
        }
      });
      doc.moveDown(0.5);
    }

    // Projects
    if (data.projects && data.projects.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PROJECTS');
      doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(72, doc.y)
        .lineTo(540, doc.y)
        .stroke();
      doc.moveDown(0.5);

      data.projects.forEach((project) => {
        if (project.name) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(project.name);
          if (project.technologies) {
            doc
              .fontSize(9)
              .fillColor('#666666')
              .text('Tech: ' + project.technologies);
            doc.fillColor('#000000');
          }
          doc.moveDown(0.2);

          if (project.description && project.description.length > 0) {
            project.description.forEach(desc => {
              if (desc.trim()) {
                doc
                  .fontSize(10)
                  .font('Helvetica')
                  .text('• ' + desc, { indent: 10 });
                doc.moveDown(0.15);
              }
            });
          }
          doc.moveDown(0.4);
        }
      });
    }
  }

  /**
   * Build resume with Sameer template - Diamond bullets and table format
   * This is already implemented as buildProfessionalTemplate
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildSameerTemplate(doc, data) {
    // Use the professional template which matches Sameer's style
    this.buildProfessionalTemplate(doc, data);
  }

  /**
   * Build resume with Rishabh template - Clean professional
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} data - Resume data
   */
  buildRishabhTemplate(doc, data) {
    // Very similar to Aditya template - clean and professional
    this.buildAdityaTemplate(doc, data);
  }

  /**
   * Helper: Add underlined section header
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {string} title - Section title
   */
  addUnderlinedSection(doc, title) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title);
    doc
      .strokeColor('#333333')
      .lineWidth(1)
      .moveTo(72, doc.y + 2)
      .lineTo(540, doc.y + 2)
      .stroke();
    doc.moveDown(0.5);
  }

  /**
   * Add a professional section header
   *
   * @param {PDFDocument} doc - PDFKit document
   * @param {string} title - Section title
   */
  addSectionHeader(doc, title) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title);

    // Add underline
    doc
      .strokeColor('#000000')
      .lineWidth(1.5)
      .moveTo(72, doc.y + 2)
      .lineTo(540, doc.y + 2)
      .stroke();

    doc.moveDown(0.5);
  }

  /**
   * Export to PDF (for compatibility - already returns buffer)
   *
   * @param {string} documentId - Not used, kept for API compatibility
   * @returns {Promise<Buffer>} PDF buffer
   */
  async exportToPDF(pdfBuffer) {
    // PDFKit already returns a buffer, so just return it
    return pdfBuffer;
  }

  /**
   * Delete document (no-op for PDFKit, kept for API compatibility)
   *
   * @param {string} documentId - Not used
   */
  async deleteDocument(documentId) {
    // No cleanup needed for PDFKit
    console.log('✅ PDF cleanup complete (no temp files)');
  }
}

// Export singleton instance
module.exports = new ResumePDFService();
