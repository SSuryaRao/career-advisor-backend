const { VertexAI } = require('@google-cloud/vertexai');

class VertexAIService {
  constructor() {
    this.client = null;
    this.model = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro';
    this.isConfigured = false;

    this.initialize();
  }

  initialize() {
    try {
      // Check if required environment variables are set
      if (!this.projectId) {
        console.warn('⚠️ Vertex AI not configured. Missing GOOGLE_CLOUD_PROJECT_ID');
        console.warn('📝 Vertex AI will be disabled. Set GOOGLE_CLOUD_PROJECT_ID in .env');
        this.isConfigured = false;
        return;
      }

      // Initialize Vertex AI client
      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (credentials) {
        this.client = new VertexAI({
          project: this.projectId,
          location: this.location,
          googleAuthOptions: {
            keyFilename: credentials
          }
        });
      } else {
        // Use default credentials (application default credentials)
        this.client = new VertexAI({
          project: this.projectId,
          location: this.location
        });
      }

      // Get the generative model
      this.model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      });

      console.log('✅ Vertex AI initialized successfully');
      console.log(`📍 Project: ${this.projectId}, Location: ${this.location}, Model: ${this.modelName}`);
      this.isConfigured = true;

    } catch (error) {
      console.error('❌ Failed to initialize Vertex AI:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Generate content using Vertex AI with retry logic
   * @param {string} prompt - The prompt text
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {object} customConfig - Optional custom generation config
   * @param {boolean} useStreaming - Whether to use streaming (default: false for better reliability)
   * @returns {Promise<string>} Generated content
   */
  async generateContent(prompt, maxRetries = 3, customConfig = null, useStreaming = false) {
    if (!this.isConfigured) {
      throw new Error('Vertex AI is not configured. Please set up environment variables.');
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Vertex AI generation attempt ${attempt}/${maxRetries}...`);

        const request = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        // Use custom model with specific config if provided
        let modelToUse;
        if (customConfig) {
          const mergedConfig = {
            ...this.model.generationConfig,
            ...customConfig
          };
          console.log(`🔧 Using custom config: maxOutputTokens=${mergedConfig.maxOutputTokens}, temperature=${mergedConfig.temperature}`);

          modelToUse = this.client.getGenerativeModel({
            model: this.modelName,
            generationConfig: mergedConfig,
            safetySettings: this.model.safetySettings
          });
        } else {
          modelToUse = this.model;
        }

        // Use non-streaming mode by default for more reliable responses
        if (!useStreaming) {
          console.log('📡 Using non-streaming mode for better reliability');
          const result = await modelToUse.generateContent(request);
          const response = result.response;

          if (!response || !response.candidates || response.candidates.length === 0) {
            throw new Error('No candidates in response');
          }

          const candidate = response.candidates[0];

          // Check finish reason
          if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
            console.warn('⚠️ Content blocked by safety filter:', candidate.finishReason);
            throw new Error(`Content blocked: ${candidate.finishReason}`);
          }

          if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('No content parts in response');
          }

          const fullText = candidate.content.parts.map(part => part.text || '').join('');

          console.log(`✅ Vertex AI generation successful on attempt ${attempt}`);
          console.log(`📊 Generated ${fullText.length} characters`);
          console.log(`🏁 Finish reason: ${candidate.finishReason || 'none'}`);

          // Warn if response is suspiciously short
          if (fullText.length < 10) {
            console.warn('⚠️  Very short response received from AI');
            console.warn('⚠️  Candidate details:', JSON.stringify({
              finishReason: candidate.finishReason,
              safetyRatings: candidate.safetyRatings,
              partsCount: candidate.content.parts.length
            }));
          }

          return fullText;
        }

        // Streaming mode (original behavior)
        console.log('📡 Using streaming mode');
        const streamingResult = await modelToUse.generateContentStream(request);

        // Collect all chunks
        let fullText = '';
        let chunkCount = 0;
        let lastFinishReason = null;

        for await (const item of streamingResult.stream) {
          chunkCount++;

          // Check for safety ratings or blocked content
          if (item.candidates && item.candidates[0]) {
            const candidate = item.candidates[0];

            // Track finish reason
            if (candidate.finishReason) {
              lastFinishReason = candidate.finishReason;
            }

            // Check if content was blocked
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
              console.warn('⚠️ Content blocked by safety filter:', candidate.finishReason);
              console.warn('⚠️ Safety ratings:', JSON.stringify(candidate.safetyRatings));
            }

            // Collect text from parts
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  fullText += part.text;
                }
              }
            }
          }
        }

        console.log(`📦 Collected ${chunkCount} chunks from stream`);
        console.log(`🏁 Finish reason: ${lastFinishReason || 'none'}`);

        if (!fullText || fullText.length === 0) {
          throw new Error('Empty response from Vertex AI');
        }

        // Warn if response seems incomplete
        if (lastFinishReason === 'MAX_TOKENS') {
          console.warn('⚠️ Response may be truncated - hit max tokens limit');
        } else if (lastFinishReason === 'STOP') {
          console.log('✅ Response completed normally (STOP)');
        } else if (lastFinishReason) {
          console.warn(`⚠️ Unusual finish reason: ${lastFinishReason}`);
        }

        console.log(`✅ Vertex AI generation successful on attempt ${attempt}`);
        console.log(`📊 Generated ${fullText.length} characters`);

        return fullText;

      } catch (error) {
        lastError = error;
        console.error(`❌ Vertex AI attempt ${attempt}/${maxRetries} failed:`, error.message);

        // Check if it's a retryable error
        const isRetryable =
          error.message?.includes('503') ||
          error.message?.includes('overloaded') ||
          error.message?.includes('temporarily') ||
          error.message?.includes('quota') ||
          error.message?.includes('rate limit');

        if (isRetryable && attempt < maxRetries) {
          const waitTime = Math.min(attempt * 2000, 10000); // Max 10s wait
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // If not retryable or last attempt, throw
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    // All retries failed
    console.error('❌ All Vertex AI retry attempts failed');
    throw lastError || new Error('Vertex AI generation failed after all retries');
  }

  /**
   * Generate content with streaming (for real-time responses)
   * @param {string} prompt - The prompt text
   * @returns {AsyncGenerator} Stream of generated content
   */
  async *generateContentStreaming(prompt) {
    if (!this.isConfigured) {
      throw new Error('Vertex AI is not configured');
    }

    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    const streamingResult = await this.model.generateContentStream(request);

    for await (const item of streamingResult.stream) {
      if (item.candidates && item.candidates[0].content.parts) {
        yield item.candidates[0].content.parts[0].text;
      }
    }
  }

  /**
   * Count tokens in a text
   * @param {string} text - Text to count tokens for
   * @returns {Promise<number>} Token count
   */
  async countTokens(text) {
    if (!this.isConfigured) {
      return 0;
    }

    try {
      const request = {
        contents: [{ role: 'user', parts: [{ text }] }],
      };

      const result = await this.model.countTokens(request);
      return result.totalTokens || 0;
    } catch (error) {
      console.error('Error counting tokens:', error.message);
      return 0;
    }
  }

  /**
   * Check if Vertex AI is configured and ready
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
      model: this.modelName,
      clientInitialized: this.client !== null,
      modelInitialized: this.model !== null
    };
  }
}

// Export singleton instance
module.exports = new VertexAIService();
