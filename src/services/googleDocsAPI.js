/**
 * Resume PDF Generator Service
 *
 * Provides functionality to create and export professional resumes
 * using PDFKit library (no Google Workspace required)
 *
 * Features:
 * - Create formatted resume documents
 * - Apply professional styling (fonts, spacing, formatting)
 * - Export to PDF format
 * - ATS-friendly formatting
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
   * @returns {Buffer} PDF Buffer
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
            left: 50,
            right: 50
          }
        });

        // Collect PDF data in buffers
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('✅ Resume PDF created');
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
    const requests = [];
    let index = 1; // Start at index 1 (Google Docs starts with index 1)

    // Helper to add text with styling
    const addText = (text, style = {}) => {
      const startIndex = index;

      // Insert text
      requests.push({
        insertText: {
          location: { index },
          text: text
        }
      });

      // Apply style if provided
      if (Object.keys(style).length > 0) {
        const endIndex = index + text.length;

        if (style.fontSize || style.bold || style.foregroundColor) {
          const textStyle = {};
          if (style.fontSize) textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' };
          if (style.bold) textStyle.bold = true;
          if (style.foregroundColor) textStyle.foregroundColor = { color: { rgbColor: style.foregroundColor } };

          requests.push({
            updateTextStyle: {
              range: { startIndex, endIndex },
              textStyle: textStyle,
              fields: Object.keys(textStyle).join(',')
            }
          });
        }

        if (style.alignment) {
          requests.push({
            updateParagraphStyle: {
              range: { startIndex, endIndex },
              paragraphStyle: {
                alignment: style.alignment
              },
              fields: 'alignment'
            }
          });
        }
      }

      index += text.length;
      return startIndex;
    };

    // 1. NAME (Large, Bold, Centered)
    if (data.name) {
      addText(`${data.name}\n`, {
        fontSize: 24,
        bold: true,
        alignment: 'CENTER'
      });
    }

    // 2. CONTACT INFO (Centered, smaller)
    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.location) contactParts.push(data.location);

    if (contactParts.length > 0) {
      addText(`${contactParts.join(' | ')}\n`, {
        fontSize: 10,
        alignment: 'CENTER'
      });
    }

    // Links (LinkedIn, GitHub)
    const links = [];
    if (data.linkedin) links.push(data.linkedin);
    if (data.github) links.push(data.github);
    if (data.website) links.push(data.website);

    if (links.length > 0) {
      addText(`${links.join(' | ')}\n\n`, {
        fontSize: 10,
        alignment: 'CENTER'
      });
    }

    // 3. PROFESSIONAL SUMMARY
    if (data.summary && data.summary.trim()) {
      addText('PROFESSIONAL SUMMARY\n', {
        fontSize: 12,
        bold: true
      });
      addText(`${data.summary}\n\n`, { fontSize: 11 });
    }

    // 4. WORK EXPERIENCE
    if (data.experience && data.experience.length > 0) {
      addText('WORK EXPERIENCE\n', {
        fontSize: 12,
        bold: true
      });

      data.experience.forEach((job, idx) => {
        // Job title and company (bold)
        if (job.position && job.company) {
          addText(`${job.position}`, { fontSize: 11, bold: true });
          addText(` | ${job.company}\n`, { fontSize: 11 });
        }

        // Duration
        if (job.duration || (job.startDate && job.endDate)) {
          const duration = job.duration || `${job.startDate} - ${job.endDate}`;
          addText(`${duration}\n`, { fontSize: 10 });
        }

        // Achievements/Description
        if (job.achievements && job.achievements.length > 0) {
          job.achievements.forEach(achievement => {
            addText(`• ${achievement}\n`, { fontSize: 11 });
          });
        } else if (job.description) {
          job.description.split('\n').forEach(line => {
            if (line.trim()) {
              addText(`• ${line.trim()}\n`, { fontSize: 11 });
            }
          });
        }

        addText('\n'); // Space between jobs
      });
    }

    // 5. EDUCATION
    if (data.education && data.education.length > 0) {
      addText('EDUCATION\n', {
        fontSize: 12,
        bold: true
      });

      data.education.forEach(edu => {
        if (edu.degree && edu.institution) {
          addText(`${edu.degree}`, { fontSize: 11, bold: true });
          addText(` | ${edu.institution}\n`, { fontSize: 11 });

          if (edu.year) {
            addText(`${edu.year}\n`, { fontSize: 10 });
          }
          if (edu.gpa) {
            addText(`GPA: ${edu.gpa}\n`, { fontSize: 10 });
          }
          addText('\n');
        }
      });
    }

    // 6. SKILLS
    if (data.skills && data.skills.length > 0) {
      addText('SKILLS\n', {
        fontSize: 12,
        bold: true
      });

      // Group skills by category if available
      const categorizedSkills = {};
      data.skills.forEach(skill => {
        const category = skill.category || 'Technical Skills';
        if (!categorizedSkills[category]) {
          categorizedSkills[category] = [];
        }
        categorizedSkills[category].push(typeof skill === 'string' ? skill : skill.name);
      });

      Object.keys(categorizedSkills).forEach(category => {
        addText(`${category}: `, { fontSize: 11, bold: true });
        addText(`${categorizedSkills[category].join(', ')}\n\n`, { fontSize: 11 });
      });
    }

    // 7. PROJECTS (if available)
    if (data.projects && data.projects.length > 0) {
      addText('PROJECTS\n', {
        fontSize: 12,
        bold: true
      });

      data.projects.forEach(project => {
        if (project.name) {
          addText(`${project.name}`, { fontSize: 11, bold: true });
          if (project.link) {
            addText(` | ${project.link}`, { fontSize: 10 });
          }
          addText('\n', { fontSize: 11 });
        }

        if (project.description) {
          addText(`${project.description}\n`, { fontSize: 11 });
        }

        if (project.technologies) {
          const techs = Array.isArray(project.technologies)
            ? project.technologies.join(', ')
            : project.technologies;
          addText(`Technologies: ${techs}\n`, { fontSize: 10 });
        }
        addText('\n');
      });
    }

    // 8. CERTIFICATIONS (if available)
    if (data.certifications && data.certifications.length > 0) {
      addText('CERTIFICATIONS\n', {
        fontSize: 12,
        bold: true
      });

      data.certifications.forEach(cert => {
        if (cert.name) {
          addText(`${cert.name}`, { fontSize: 11, bold: true });
          if (cert.issuer) {
            addText(` - ${cert.issuer}`, { fontSize: 11 });
          }
          if (cert.date) {
            addText(` (${cert.date})`, { fontSize: 10 });
          }
          addText('\n', { fontSize: 11 });
        }
      });
    }

    return requests;
  }

  /**
   * Export Google Doc to PDF
   *
   * @param {string} documentId - Google Doc ID
   * @returns {Buffer} PDF file buffer
   */
  async exportToPDF(documentId) {
    if (!this.isConfigured) {
      throw new Error('Google Docs API not configured');
    }

    try {
      console.log(`📥 Exporting document ${documentId} to PDF...`);

      const response = await this.drive.files.export(
        {
          fileId: documentId,
          mimeType: 'application/pdf'
        },
        { responseType: 'arraybuffer' }
      );

      console.log('✅ PDF export successful');

      return Buffer.from(response.data);

    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
      throw new Error(`Failed to export to PDF: ${error.message}`);
    }
  }

  /**
   * Delete Google Doc after processing
   *
   * @param {string} documentId - Google Doc ID
   */
  async deleteDocument(documentId) {
    if (!this.isConfigured) {
      return; // Silently skip if not configured
    }

    try {
      await this.drive.files.delete({
        fileId: documentId
      });
      console.log(`🗑️  Deleted temporary document: ${documentId}`);
    } catch (error) {
      console.warn(`⚠️  Failed to delete document ${documentId}:`, error.message);
    }
  }
}

// Export singleton instance
module.exports = new GoogleDocsService();
