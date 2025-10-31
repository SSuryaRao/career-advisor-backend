const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const path = require('path');

class DocumentAIService {
  constructor() {
    this.client = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.DOCUMENT_AI_LOCATION || 'us';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    this.isConfigured = false;

    this.initialize();
  }

  initialize() {
    try {
      // Check if all required environment variables are set
      if (!this.projectId || !this.processorId) {
        console.warn('⚠️ Document AI not fully configured. Missing GOOGLE_CLOUD_PROJECT_ID or DOCUMENT_AI_PROCESSOR_ID');
        console.warn('📝 Document AI will be disabled. Using fallback pdf-parse method.');
        this.isConfigured = false;
        return;
      }

      // Initialize the Document AI client
      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // Initialize with appropriate credentials
      // - In production (App Engine/Cloud Run): Uses Application Default Credentials (ADC)
      // - In development: Uses keyFilename if GOOGLE_APPLICATION_CREDENTIALS is set
      if (credentials) {
        // Local development with explicit service account key
        this.client = new DocumentProcessorServiceClient({
          keyFilename: credentials
        });
        console.log('✅ Document AI client initialized with service account key');
        this.isConfigured = true;
      } else if (process.env.NODE_ENV === 'production') {
        // Production: Use Application Default Credentials
        // App Engine automatically provides credentials via the attached service account
        this.client = new DocumentProcessorServiceClient();
        console.log('✅ Document AI client initialized with Application Default Credentials');
        this.isConfigured = true;
      } else {
        console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS not set. Document AI will be disabled.');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Document AI:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Process a resume PDF using Document AI
   * @param {Buffer} fileBuffer - PDF file buffer
   * @param {string} mimeType - MIME type of the document
   * @returns {Promise<Object>} Processed document data
   */
  async processResume(fileBuffer, mimeType = 'application/pdf') {
    if (!this.isConfigured) {
      throw new Error('Document AI is not configured. Please set up environment variables.');
    }

    try {
      // Construct the processor name
      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

      console.log('📄 Processing resume with Document AI...');
      console.log('📍 Processor:', name);

      // Create the request
      const request = {
        name,
        rawDocument: {
          content: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      // Process the document
      const [result] = await this.client.processDocument(request);
      const { document } = result;

      console.log('✅ Document AI processing completed');

      // Extract structured data
      const extractedData = this.extractStructuredData(document);

      return {
        success: true,
        text: document.text,
        structuredData: extractedData,
        confidence: this.calculateConfidence(document),
        pages: document.pages?.length || 0,
        metadata: {
          processorType: 'resume-parser',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Document AI processing error:', error);
      throw new Error(`Document AI failed: ${error.message}`);
    }
  }

  /**
   * Extract structured data from the document
   * @param {Object} document - Document AI document object
   * @returns {Object} Structured data
   */
  extractStructuredData(document) {
    const structuredData = {
      name: null,
      email: null,
      phone: null,
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      languages: [],
      summary: null
    };

    // Extract entities if available
    if (document.entities && document.entities.length > 0) {
      document.entities.forEach(entity => {
        const type = entity.type;
        const mentionText = entity.mentionText;
        const confidence = entity.confidence || 0;

        // Only include high-confidence entities
        if (confidence < 0.5) return;

        switch (type) {
          case 'person_name':
          case 'name':
            if (!structuredData.name) {
              structuredData.name = mentionText;
            }
            break;

          case 'email':
          case 'email_address':
            if (!structuredData.email) {
              structuredData.email = mentionText;
            }
            break;

          case 'phone':
          case 'phone_number':
            if (!structuredData.phone) {
              structuredData.phone = mentionText;
            }
            break;

          case 'skill':
          case 'skills':
            structuredData.skills.push({
              name: mentionText,
              confidence: confidence
            });
            break;

          case 'experience':
          case 'work_experience':
            structuredData.experience.push({
              text: mentionText,
              confidence: confidence
            });
            break;

          case 'education':
          case 'degree':
          case 'university':
            structuredData.education.push({
              text: mentionText,
              confidence: confidence
            });
            break;

          case 'certification':
          case 'certificate':
            structuredData.certifications.push({
              name: mentionText,
              confidence: confidence
            });
            break;

          case 'language':
            structuredData.languages.push({
              name: mentionText,
              confidence: confidence
            });
            break;
        }
      });
    }

    // Extract contact information using regex patterns from text
    if (document.text) {
      const text = document.text;

      // Extract email if not found
      if (!structuredData.email) {
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          structuredData.email = emailMatch[0];
        }
      }

      // Extract phone if not found
      if (!structuredData.phone) {
        const phoneMatch = text.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/);
        if (phoneMatch) {
          structuredData.phone = phoneMatch[0];
        }
      }

      // Extract skills using common patterns
      const skillKeywords = ['skills', 'technical skills', 'technologies', 'expertise'];
      skillKeywords.forEach(keyword => {
        const skillSectionMatch = text.match(new RegExp(`${keyword}[:\\s]([^\\n]+(?:\\n[^\\n]+)*)`, 'i'));
        if (skillSectionMatch && structuredData.skills.length === 0) {
          const skillsText = skillSectionMatch[1];
          const extractedSkills = skillsText
            .split(/[,|\n]/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.length < 50);

          extractedSkills.forEach(skill => {
            if (!structuredData.skills.find(s => s.name === skill)) {
              structuredData.skills.push({ name: skill, confidence: 0.7 });
            }
          });
        }
      });
    }

    return structuredData;
  }

  /**
   * Calculate overall confidence score
   * @param {Object} document - Document AI document object
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(document) {
    if (!document.entities || document.entities.length === 0) {
      return 0.6; // Default confidence when no entities
    }

    const confidences = document.entities
      .filter(e => e.confidence)
      .map(e => e.confidence);

    if (confidences.length === 0) return 0.6;

    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Check if Document AI is configured and ready
   * @returns {boolean}
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Get service status
   * @returns {Object}
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      projectId: this.projectId,
      location: this.location,
      processorId: this.processorId ? '***' + this.processorId.slice(-4) : null,
      clientInitialized: this.client !== null
    };
  }
}

// Export singleton instance
module.exports = new DocumentAIService();
