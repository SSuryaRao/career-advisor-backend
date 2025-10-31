const vertexAI = require('./vertexAI');
const speechToText = require('./speechToText');
const videoIntelligence = require('./videoIntelligence');
const cloudStorage = require('./cloudStorage');
const { getDomainById } = require('../config/interviewDomains');

class InterviewAnalysisService {
  /**
   * Analyze interview response - Standard Mode
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Analysis result with feedback
   */
  async analyzeStandard(params) {
    const {
      questionText,
      responseText,
      domainId,
      level,
      expectedKeywords = []
    } = params;

    try {
      console.log('📊 Starting standard analysis...');

      const domain = getDomainById(domainId);

      const prompt = this.buildStandardAnalysisPrompt({
        questionText,
        responseText,
        domain,
        level,
        expectedKeywords
      });

      const analysisText = await vertexAI.generateContent(prompt);
      const structuredAnalysis = this.parseAnalysisResponse(analysisText);

      console.log('✅ Standard analysis complete');

      return {
        mode: 'standard',
        score: structuredAnalysis.score,
        feedback: {
          strengths: structuredAnalysis.strengths,
          improvements: structuredAnalysis.improvements,
          technicalAccuracy: structuredAnalysis.technicalAccuracy,
          clarity: structuredAnalysis.clarity,
          relevance: structuredAnalysis.relevance
        },
        domainSpecificInsights: structuredAnalysis.domainInsights,
        overallAssessment: structuredAnalysis.overall,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in standard analysis:', error.message);
      throw error;
    }
  }

  /**
   * Analyze interview response - Advanced Mode
   * Includes speech patterns and video analysis
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Comprehensive analysis result
   */
  async analyzeAdvanced(params) {
    const {
      questionText,
      audioBuffer,
      videoBuffer,
      domainId,
      level,
      userId,
      sessionId,
      expectedKeywords = []
    } = params;

    try {
      console.log('📊 Starting advanced analysis...');

      const domain = getDomainById(domainId);
      let transcriptionResult = null;
      let speechPatterns = null;
      let videoAnalysis = null;
      let responseText = '';

      // Step 1 & 2: Run transcription and video analysis in parallel for better performance
      console.log('⚡ Running transcription and video analysis in parallel...');

      const parallelTasks = [];

      // Add transcription task with domain-specific vocabulary
      if (audioBuffer) {
        parallelTasks.push(
          speechToText.transcribeAudio(
            audioBuffer,
            'WEBM_OPUS',
            48000,
            'en-US',
            domainId // Pass domain ID for context-specific vocabulary hints
          ).then(result => ({ type: 'transcription', result }))
          .catch(error => ({ type: 'transcription', error }))
        );
      }

      // Add video analysis task
      if (videoBuffer && cloudStorage.isReady()) {
        parallelTasks.push(
          videoIntelligence.analyzeVideoFromBuffer(
            videoBuffer,
            cloudStorage,
            userId,
            sessionId
          ).then(result => ({ type: 'video', result }))
          .catch(error => ({ type: 'video', error }))
        );
      }

      // Wait for all tasks to complete
      const results = await Promise.all(parallelTasks);

      // Process results
      for (const taskResult of results) {
        if (taskResult.type === 'transcription') {
          if (taskResult.error) {
            console.error('❌ Transcription failed:', taskResult.error.message);
            throw taskResult.error;
          }
          console.log('🎤 Transcription complete');
          transcriptionResult = taskResult.result;
          responseText = transcriptionResult.transcript;
          speechPatterns = speechToText.analyzeSpeechPatterns(transcriptionResult);
          console.log(`✅ Transcription analyzed. Word count: ${speechPatterns.totalWords}`);
        } else if (taskResult.type === 'video') {
          if (taskResult.error) {
            console.warn('⚠️ Video analysis failed, continuing without it:', taskResult.error.message);
            videoAnalysis = null;
          } else {
            console.log('🎥 Video analysis complete');
            videoAnalysis = taskResult.result;
          }
        }
      }

      // Step 3: Content analysis using AI
      console.log('🤖 Performing AI content analysis...');
      const prompt = this.buildAdvancedAnalysisPrompt({
        questionText,
        responseText,
        domain,
        level,
        expectedKeywords,
        speechPatterns,
        videoAnalysis
      });

      const analysisText = await vertexAI.generateContent(prompt);
      const structuredAnalysis = this.parseAnalysisResponse(analysisText);

      // Step 4: Calculate comprehensive score
      const comprehensiveScore = this.calculateAdvancedScore({
        contentScore: structuredAnalysis.score,
        speechPatterns,
        videoAnalysis
      });

      // Evaluate transcription quality and add warnings if needed
      const transcriptionQuality = this.evaluateTranscriptionQuality(transcriptionResult);

      console.log('✅ Advanced analysis complete');

      return {
        mode: 'advanced',
        score: comprehensiveScore.total,
        scoreBreakdown: comprehensiveScore.breakdown,
        feedback: {
          strengths: structuredAnalysis.strengths,
          improvements: structuredAnalysis.improvements,
          technicalAccuracy: structuredAnalysis.technicalAccuracy,
          clarity: structuredAnalysis.clarity,
          relevance: structuredAnalysis.relevance
        },
        domainSpecificInsights: structuredAnalysis.domainInsights,
        speechAnalysis: speechPatterns ? {
          wordsPerMinute: speechPatterns.wordsPerMinute,
          fillerWordCount: speechPatterns.fillerWordCount,
          fillerWordPercentage: speechPatterns.fillerWordPercentage,
          confidence: speechPatterns.confidence,
          recommendations: this.generateSpeechRecommendations(speechPatterns)
        } : null,
        bodyLanguageAnalysis: videoAnalysis ? {
          eyeContact: videoAnalysis.bodyLanguageInsights.eyeContact,
          bodyMovement: videoAnalysis.bodyLanguageInsights.bodyMovement,
          overallPresence: videoAnalysis.bodyLanguageInsights.overallPresence,
          recommendations: videoAnalysis.bodyLanguageInsights.recommendations
        } : null,
        transcription: {
          text: responseText,
          confidence: transcriptionResult?.confidence || 0,
          wordCount: transcriptionResult?.wordCount || 0,
          duration: parseFloat(transcriptionResult?.duration) || 0
        },
        transcriptionQuality: transcriptionQuality, // Add quality assessment
        overallAssessment: structuredAnalysis.overall,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in advanced analysis:', error.message);
      throw error;
    }
  }

  /**
   * Build prompt for standard analysis
   */
  buildStandardAnalysisPrompt({ questionText, responseText, domain, level, expectedKeywords }) {
    // Ensure expectedKeywords is an array
    const keywordsArray = Array.isArray(expectedKeywords) ? expectedKeywords : [];

    return `You are an expert interview coach specializing in ${domain?.name || 'professional interviews'}.

**Interview Question:** ${questionText}

**Candidate's Response:** ${responseText}

**Context:**
- Domain: ${domain?.name || 'General'}
- Level: ${level || 'Mid-Level'}
- Expected Keywords: ${keywordsArray.length > 0 ? keywordsArray.join(', ') : 'N/A'}

**Task:** Provide a comprehensive analysis of the candidate's response. Format your response EXACTLY as follows:

**SCORE: [0-100]**

**STRENGTHS:**
- [Strength 1]
- [Strength 2]
- [Strength 3]

**IMPROVEMENTS:**
- [Improvement 1]
- [Improvement 2]
- [Improvement 3]

**TECHNICAL_ACCURACY: [0-100]**
Brief explanation of technical accuracy.

**CLARITY: [0-100]**
Brief explanation of clarity.

**RELEVANCE: [0-100]**
Brief explanation of relevance to the question.

**DOMAIN_INSIGHTS:**
Specific insights related to ${domain?.name || 'this domain'}.

**OVERALL:**
A concise 2-3 sentence overall assessment.

Focus on:
1. Technical accuracy and depth of knowledge
2. Communication clarity and structure
3. Relevance to the question asked
4. Use of industry-specific terminology
5. Real-world applicability`;
  }

  /**
   * Build prompt for advanced analysis
   */
  buildAdvancedAnalysisPrompt({ questionText, responseText, domain, level, expectedKeywords, speechPatterns, videoAnalysis }) {
    let additionalContext = '';

    // Ensure expectedKeywords is an array
    const keywordsArray = Array.isArray(expectedKeywords) ? expectedKeywords : [];

    if (speechPatterns) {
      additionalContext += `\n**Speech Delivery Metrics:**
- Words per minute: ${speechPatterns.wordsPerMinute}
- Filler words: ${speechPatterns.fillerWordCount} (${speechPatterns.fillerWordPercentage}%)
- Speech confidence: ${speechPatterns.confidence}%
- Long pauses: ${speechPatterns.longPauses}`;
    }

    if (videoAnalysis) {
      additionalContext += `\n**Body Language Analysis:**
- Eye contact: ${videoAnalysis.bodyLanguageInsights.eyeContact}
- Body movement: ${videoAnalysis.bodyLanguageInsights.bodyMovement}
- Overall presence: ${videoAnalysis.bodyLanguageInsights.overallPresence}`;
    }

    return `You are an expert interview coach specializing in ${domain?.name || 'professional interviews'}.

**Interview Question:** ${questionText}

**Candidate's Response (Transcribed):** ${responseText}

**Context:**
- Domain: ${domain?.name || 'General'}
- Level: ${level || 'Mid-Level'}
- Expected Keywords: ${keywordsArray.length > 0 ? keywordsArray.join(', ') : 'N/A'}
${additionalContext}

**Task:** Provide a comprehensive analysis considering BOTH content quality AND delivery. Format your response EXACTLY as follows:

**SCORE: [0-100]**

**STRENGTHS:**
- [Strength 1]
- [Strength 2]
- [Strength 3]
- [Strength 4]
- [Strength 5]

**IMPROVEMENTS:**
- [Improvement 1]
- [Improvement 2]
- [Improvement 3]
- [Improvement 4]
- [Improvement 5]

**TECHNICAL_ACCURACY: [0-100]**
Brief explanation of technical accuracy.

**CLARITY: [0-100]**
Brief explanation of clarity and communication effectiveness.

**RELEVANCE: [0-100]**
Brief explanation of relevance to the question.

**DOMAIN_INSIGHTS:**
Specific insights related to ${domain?.name || 'this domain'}, considering both content and delivery.

**OVERALL:**
A concise 2-3 sentence overall assessment integrating content, delivery, and presentation.`;
  }

  /**
   * Parse AI analysis response into structured format
   */
  parseAnalysisResponse(analysisText) {
    const result = {
      score: 0,
      strengths: [],
      improvements: [],
      technicalAccuracy: 0,
      clarity: 0,
      relevance: 0,
      domainInsights: '',
      overall: ''
    };

    try {
      // Extract score
      const scoreMatch = analysisText.match(/\*\*SCORE:\s*\[?(\d+)\]?/i);
      if (scoreMatch) {
        result.score = parseInt(scoreMatch[1]);
      }

      // Extract strengths
      const strengthsMatch = analysisText.match(/\*\*STRENGTHS:\*\*([\s\S]*?)\*\*IMPROVEMENTS:/i);
      if (strengthsMatch) {
        result.strengths = strengthsMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5);
      }

      // Extract improvements
      const improvementsMatch = analysisText.match(/\*\*IMPROVEMENTS:\*\*([\s\S]*?)\*\*TECHNICAL_ACCURACY:/i);
      if (improvementsMatch) {
        result.improvements = improvementsMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 5);
      }

      // Extract technical accuracy
      const techMatch = analysisText.match(/\*\*TECHNICAL_ACCURACY:\s*\[?(\d+)\]?/i);
      if (techMatch) {
        result.technicalAccuracy = parseInt(techMatch[1]);
      }

      // Extract clarity
      const clarityMatch = analysisText.match(/\*\*CLARITY:\s*\[?(\d+)\]?/i);
      if (clarityMatch) {
        result.clarity = parseInt(clarityMatch[1]);
      }

      // Extract relevance
      const relevanceMatch = analysisText.match(/\*\*RELEVANCE:\s*\[?(\d+)\]?/i);
      if (relevanceMatch) {
        result.relevance = parseInt(relevanceMatch[1]);
      }

      // Extract domain insights
      const domainMatch = analysisText.match(/\*\*DOMAIN_INSIGHTS:\*\*([\s\S]*?)\*\*OVERALL:/i);
      if (domainMatch) {
        result.domainInsights = domainMatch[1].trim();
      }

      // Extract overall assessment
      const overallMatch = analysisText.match(/\*\*OVERALL:\*\*([\s\S]*?)$/i);
      if (overallMatch) {
        result.overall = overallMatch[1].trim();
      }

    } catch (error) {
      console.error('Error parsing analysis response:', error.message);
    }

    return result;
  }

  /**
   * Calculate comprehensive score for advanced mode
   */
  calculateAdvancedScore({ contentScore, speechPatterns, videoAnalysis }) {
    let weights = {
      content: 0.60,
      delivery: 0.25,
      bodyLanguage: 0.15
    };

    // Adjust weights if video analysis is not available
    if (!videoAnalysis) {
      weights = {
        content: 0.70,
        delivery: 0.30,
        bodyLanguage: 0
      };
    }

    const breakdown = {
      content: contentScore,
      delivery: 0,
      bodyLanguage: 0
    };

    // Calculate delivery score based on speech patterns
    if (speechPatterns) {
      let deliveryScore = 100;

      // Penalize for too fast or too slow speech
      if (speechPatterns.wordsPerMinute < 100 || speechPatterns.wordsPerMinute > 180) {
        deliveryScore -= 15;
      } else if (speechPatterns.wordsPerMinute < 120 || speechPatterns.wordsPerMinute > 160) {
        deliveryScore -= 5;
      }

      // Penalize for filler words
      const fillerPercentage = parseFloat(speechPatterns.fillerWordPercentage);
      if (fillerPercentage > 5) {
        deliveryScore -= Math.min(20, fillerPercentage * 2);
      }

      // Penalize for long pauses
      if (speechPatterns.longPauses > 3) {
        deliveryScore -= Math.min(15, speechPatterns.longPauses * 3);
      }

      // Adjust for confidence
      const confidence = parseFloat(speechPatterns.confidence);
      deliveryScore = (deliveryScore * 0.7) + (confidence * 0.3);

      breakdown.delivery = Math.max(0, Math.min(100, deliveryScore));
    }

    // Calculate body language score using numeric score if available
    if (videoAnalysis) {
      // Use the new numericScore if available, fallback to old confidence-based calculation
      const bodyLanguageScore = videoAnalysis.bodyLanguageInsights.numericScore !== undefined
        ? videoAnalysis.bodyLanguageInsights.numericScore
        : (videoAnalysis.bodyLanguageInsights.confidence || 0) * 100;
      breakdown.bodyLanguage = Math.max(0, Math.min(100, bodyLanguageScore));
    }

    // Calculate weighted total
    const total = Math.round(
      (breakdown.content * weights.content) +
      (breakdown.delivery * weights.delivery) +
      (breakdown.bodyLanguage * weights.bodyLanguage)
    );

    return {
      total: Math.max(0, Math.min(100, total)),
      breakdown
    };
  }

  /**
   * Evaluate transcription quality and generate warnings
   */
  evaluateTranscriptionQuality(transcriptionResult) {
    if (!transcriptionResult) {
      return {
        warning: true,
        level: 'error',
        message: 'Transcription failed completely',
        suggestions: ['Please try recording again', 'Ensure microphone is working']
      };
    }

    const confidence = transcriptionResult.confidence || 0;
    const wordCount = transcriptionResult.wordCount || 0;

    // Critical: Very low confidence
    if (confidence < 0.7) {
      return {
        warning: true,
        level: 'critical',
        message: 'Audio quality was poor. The transcription may be inaccurate.',
        suggestions: [
          'Use a quiet environment without background noise',
          'Speak clearly and at a normal pace',
          'Check that your microphone is working properly',
          'Consider re-recording for better analysis'
        ]
      };
    }

    // Warning: Moderate confidence
    if (confidence < 0.85) {
      return {
        warning: true,
        level: 'warning',
        message: 'Audio quality could be improved for better accuracy.',
        suggestions: [
          'Try to minimize background noise',
          'Speak clearly towards the microphone',
          'Maintain consistent volume throughout'
        ]
      };
    }

    // Warning: Very short response
    if (wordCount < 20) {
      return {
        warning: true,
        level: 'info',
        message: 'Your response was quite brief. Longer responses provide better analysis.',
        suggestions: [
          'Try to provide more detailed explanations',
          'Include examples or context to support your answer',
          'Aim for 30-50 words minimum for better feedback'
        ]
      };
    }

    // All good!
    return {
      warning: false,
      level: 'success',
      message: 'Excellent audio quality. Transcription is highly accurate.',
      suggestions: []
    };
  }

  /**
   * Generate speech recommendations
   */
  generateSpeechRecommendations(speechPatterns) {
    const recommendations = [];

    const wpm = speechPatterns.wordsPerMinute;
    if (wpm < 100) {
      recommendations.push('Try to speak a bit faster - aim for 120-150 words per minute');
    } else if (wpm > 180) {
      recommendations.push('Slow down your speech pace - aim for 120-150 words per minute');
    } else {
      recommendations.push('Great speech pace - keep it up!');
    }

    const fillerPercentage = parseFloat(speechPatterns.fillerWordPercentage);
    if (fillerPercentage > 5) {
      recommendations.push('Reduce filler words like "um", "uh", "like" - pause instead');
    } else if (fillerPercentage > 2) {
      recommendations.push('Good job minimizing filler words, keep working on it');
    }

    if (speechPatterns.longPauses > 3) {
      recommendations.push('Try to reduce long pauses - brief pauses are natural and good');
    }

    return recommendations;
  }
}

// Export singleton instance
module.exports = new InterviewAnalysisService();
