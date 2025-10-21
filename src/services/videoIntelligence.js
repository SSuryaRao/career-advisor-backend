const video = require('@google-cloud/video-intelligence');

class VideoIntelligenceService {
  constructor() {
    this.client = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.isConfigured = false;

    this.initialize();
  }

  initialize() {
    try {
      if (!this.projectId) {
        console.warn('⚠️ Video Intelligence not configured. Missing GOOGLE_CLOUD_PROJECT_ID');
        this.isConfigured = false;
        return;
      }

      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (credentials) {
        this.client = new video.VideoIntelligenceServiceClient({
          projectId: this.projectId,
          keyFilename: credentials
        });
      } else {
        this.client = new video.VideoIntelligenceServiceClient({
          projectId: this.projectId
        });
      }

      console.log('✅ Video Intelligence initialized successfully');
      this.isConfigured = true;

    } catch (error) {
      console.error('❌ Failed to initialize Video Intelligence:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Analyze video for person detection (body language, gestures)
   * @param {string} gcsUri - GCS URI (gs://bucket/file)
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeVideo(gcsUri) {
    if (!this.isConfigured) {
      throw new Error('Video Intelligence is not configured');
    }

    try {
      console.log(`🎥 Starting video analysis: ${gcsUri}`);

      const request = {
        inputUri: gcsUri,
        features: [
          'PERSON_DETECTION',
          'FACE_DETECTION',
          'LABEL_DETECTION'
        ],
        videoContext: {
          personDetectionConfig: {
            includeBoundingBoxes: true,
            includePoseLandmarks: true,
            includeAttributes: true
          }
        }
      };

      const [operation] = await this.client.annotateVideo(request);
      console.log('⏳ Waiting for video analysis to complete...');

      const [operationResult] = await operation.promise();
      const annotationResults = operationResult.annotationResults[0];

      console.log('✅ Video analysis complete');

      return this.processAnnotations(annotationResults);

    } catch (error) {
      console.error('❌ Error analyzing video:', error.message);
      throw error;
    }
  }

  /**
   * Process video annotations and extract insights
   */
  processAnnotations(annotations) {
    const result = {
      personDetection: this.processPersonDetection(annotations.personDetectionAnnotations),
      faceDetection: this.processFaceDetection(annotations.faceDetectionAnnotations),
      labels: this.processLabels(annotations.segmentLabelAnnotations),
      bodyLanguageInsights: {}
    };

    // Generate body language insights
    result.bodyLanguageInsights = this.generateBodyLanguageInsights(result);

    return result;
  }

  /**
   * Process person detection annotations
   */
  processPersonDetection(personAnnotations) {
    if (!personAnnotations || personAnnotations.length === 0) {
      return {
        detected: false,
        confidence: 0,
        tracks: []
      };
    }

    const tracks = personAnnotations.map(person => {
      const segments = person.tracks.map(track => ({
        startTime: this.convertTimestamp(track.segment.startTimeOffset),
        endTime: this.convertTimestamp(track.segment.endTimeOffset),
        confidence: track.confidence || 0
      }));

      return {
        segments,
        attributes: person.attributes || [],
        avgConfidence: segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
      };
    });

    const avgConfidence = tracks.reduce((sum, t) => sum + t.avgConfidence, 0) / tracks.length;

    return {
      detected: true,
      confidence: avgConfidence,
      tracks,
      totalTracks: tracks.length
    };
  }

  /**
   * Process face detection annotations
   */
  processFaceDetection(faceAnnotations) {
    if (!faceAnnotations || faceAnnotations.length === 0) {
      return {
        detected: false,
        facesCount: 0,
        tracks: []
      };
    }

    const tracks = faceAnnotations.map(face => {
      const segments = face.tracks.map(track => ({
        startTime: this.convertTimestamp(track.segment.startTimeOffset),
        endTime: this.convertTimestamp(track.segment.endTimeOffset),
        confidence: track.confidence || 0
      }));

      return {
        segments,
        avgConfidence: segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
      };
    });

    return {
      detected: true,
      facesCount: tracks.length,
      tracks,
      avgConfidence: tracks.reduce((sum, t) => sum + t.avgConfidence, 0) / tracks.length
    };
  }

  /**
   * Process label detection
   */
  processLabels(labelAnnotations) {
    if (!labelAnnotations || labelAnnotations.length === 0) {
      return [];
    }

    return labelAnnotations.map(label => ({
      description: label.entity.description,
      confidence: label.segments.reduce((sum, s) => sum + s.confidence, 0) / label.segments.length,
      categoryEntities: label.categoryEntities.map(e => e.description)
    })).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate body language insights
   */
  generateBodyLanguageInsights(analysisResult) {
    const insights = {
      eyeContact: 'Not Available',
      bodyMovement: 'Not Available',
      overallPresence: 'Not Available',
      confidence: 0,
      recommendations: []
    };

    const { personDetection, faceDetection } = analysisResult;

    // Eye contact assessment (based on face detection)
    if (faceDetection.detected) {
      const faceConfidence = faceDetection.avgConfidence;

      if (faceConfidence > 0.8) {
        insights.eyeContact = 'Excellent';
        insights.recommendations.push('Great eye contact maintained throughout');
      } else if (faceConfidence > 0.6) {
        insights.eyeContact = 'Good';
        insights.recommendations.push('Good eye contact, try to maintain it more consistently');
      } else if (faceConfidence > 0.4) {
        insights.eyeContact = 'Fair';
        insights.recommendations.push('Work on maintaining better eye contact with the camera');
      } else {
        insights.eyeContact = 'Needs Improvement';
        insights.recommendations.push('Try to look at the camera more frequently to simulate eye contact');
      }

      insights.confidence = faceConfidence;
    }

    // Body movement assessment
    if (personDetection.detected && personDetection.totalTracks > 0) {
      const trackVariance = personDetection.tracks.length;

      if (trackVariance > 5) {
        insights.bodyMovement = 'Very Active';
        insights.recommendations.push('Consider reducing excessive movement for a more professional appearance');
      } else if (trackVariance > 2) {
        insights.bodyMovement = 'Moderate';
        insights.recommendations.push('Good balance of movement and stillness');
      } else {
        insights.bodyMovement = 'Minimal';
        insights.recommendations.push('Use natural hand gestures to emphasize key points');
      }
    }

    // Overall presence
    const overallScore = (faceDetection.avgConfidence || 0 + personDetection.confidence || 0) / 2;

    if (overallScore > 0.75) {
      insights.overallPresence = 'Strong';
    } else if (overallScore > 0.5) {
      insights.overallPresence = 'Good';
    } else if (overallScore > 0.3) {
      insights.overallPresence = 'Fair';
    } else {
      insights.overallPresence = 'Needs Improvement';
    }

    insights.confidence = overallScore;

    return insights;
  }

  /**
   * Analyze video from buffer (upload to temp storage first)
   * This is a helper method that combines upload and analysis
   */
  async analyzeVideoFromBuffer(videoBuffer, cloudStorageService, userId, sessionId) {
    if (!this.isConfigured) {
      throw new Error('Video Intelligence is not configured');
    }

    try {
      // Upload to Cloud Storage
      const uploadResult = await cloudStorageService.uploadInterviewRecording(
        videoBuffer,
        'video/webm',
        userId,
        sessionId
      );

      // Analyze video
      const analysisResult = await this.analyzeVideo(uploadResult.filePath);

      // Clean up the uploaded file
      await cloudStorageService.deleteInterviewRecording(uploadResult.fileName);

      return analysisResult;

    } catch (error) {
      console.error('❌ Error in video analysis pipeline:', error.message);
      throw error;
    }
  }

  /**
   * Convert protobuf timestamp to seconds
   */
  convertTimestamp(timestamp) {
    if (!timestamp) return 0;
    return (timestamp.seconds || 0) + (timestamp.nanos || 0) / 1e9;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      projectId: this.projectId,
      clientInitialized: this.client !== null
    };
  }
}

// Export singleton instance
module.exports = new VideoIntelligenceService();
