const speech = require('@google-cloud/speech');

class SpeechToTextService {
  constructor() {
    this.client = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.isConfigured = false;

    this.initialize();
  }

  initialize() {
    try {
      if (!this.projectId) {
        console.warn('⚠️ Speech-to-Text not configured. Missing GOOGLE_CLOUD_PROJECT_ID');
        this.isConfigured = false;
        return;
      }

      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (credentials) {
        this.client = new speech.SpeechClient({
          projectId: this.projectId,
          keyFilename: credentials
        });
      } else {
        this.client = new speech.SpeechClient({
          projectId: this.projectId
        });
      }

      console.log('✅ Speech-to-Text initialized successfully');
      this.isConfigured = true;

    } catch (error) {
      console.error('❌ Failed to initialize Speech-to-Text:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Transcribe audio from buffer
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} encoding - Audio encoding (LINEAR16, FLAC, WEBM_OPUS, etc.)
   * @param {number} sampleRateHertz - Sample rate (e.g., 16000, 48000)
   * @param {string} languageCode - Language code (default: en-US)
   * @returns {Promise<Object>} Transcription result with text and confidence
   */
  async transcribeAudio(audioBuffer, encoding = 'WEBM_OPUS', sampleRateHertz = 48000, languageCode = 'en-US') {
    if (!this.isConfigured) {
      throw new Error('Speech-to-Text is not configured');
    }

    try {
      console.log('🎤 Starting audio transcription...');
      console.log(`Encoding: ${encoding}, Sample Rate: ${sampleRateHertz}, Language: ${languageCode}`);

      // Calculate estimated audio duration based on buffer size
      // For WEBM_OPUS at 48kHz, rough estimate is: bytes / (sampleRate * channels * bytesPerSample * compressionRatio)
      // A more conservative check: if buffer > 10MB, likely > 1 minute
      const bufferSizeInMB = audioBuffer.length / (1024 * 1024);
      const isLikelyLongAudio = bufferSizeInMB > 1; // Conservative threshold

      if (isLikelyLongAudio) {
        console.log(`⏱️ Audio appears to be long (${bufferSizeInMB.toFixed(2)}MB), using long-running recognition with GCS`);
        return await this.transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode);
      }

      const audio = {
        content: audioBuffer.toString('base64')
      };

      const config = {
        encoding,
        sampleRateHertz,
        languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
        model: 'default',
        useEnhanced: true
      };

      const request = {
        audio,
        config
      };

      const [response] = await this.client.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0])
        .filter(alt => alt.transcript);

      if (transcription.length === 0) {
        return {
          transcript: '',
          confidence: 0,
          words: [],
          duration: 0
        };
      }

      // Combine all transcripts
      const fullTranscript = transcription
        .map(alt => alt.transcript)
        .join(' ');

      // Calculate average confidence
      const avgConfidence = transcription.reduce((sum, alt) => sum + (alt.confidence || 0), 0) / transcription.length;

      // Extract word-level information
      const words = [];
      transcription.forEach(alt => {
        if (alt.words) {
          alt.words.forEach(wordInfo => {
            words.push({
              word: wordInfo.word,
              startTime: this.convertDuration(wordInfo.startTime),
              endTime: this.convertDuration(wordInfo.endTime),
              confidence: wordInfo.confidence || 0
            });
          });
        }
      });

      // Calculate total duration
      const duration = words.length > 0
        ? words[words.length - 1].endTime
        : 0;

      console.log(`✅ Transcription complete. Length: ${fullTranscript.length} characters`);
      console.log(`Confidence: ${(avgConfidence * 100).toFixed(2)}%`);

      return {
        transcript: fullTranscript.trim(),
        confidence: avgConfidence,
        words,
        duration,
        wordCount: words.length
      };

    } catch (error) {
      // If we get a "sync input too long" error, retry with long-running recognition
      if (error.message && error.message.includes('Sync input too long')) {
        console.log('⏱️ Audio too long for sync recognition, retrying with long-running recognition...');
        return await this.transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode);
      }
      console.error('❌ Error transcribing audio:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe long audio using Cloud Storage
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} encoding - Audio encoding
   * @param {number} sampleRateHertz - Sample rate
   * @param {string} languageCode - Language code
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode) {
    const cloudStorage = require('./cloudStorage');

    if (!cloudStorage.isReady()) {
      throw new Error('Cloud Storage is required for long audio transcription but is not configured');
    }

    try {
      // Upload audio to GCS
      const timestamp = Date.now();
      const filename = `temp-audio-${timestamp}.webm`;
      console.log(`☁️ Uploading audio to Cloud Storage: ${filename}`);

      const gcsUri = await cloudStorage.uploadBuffer(
        audioBuffer,
        `transcription-temp/${filename}`,
        'audio/webm'
      );

      console.log(`✅ Upload complete: ${gcsUri}`);

      // Transcribe from GCS
      const result = await this.transcribeFromGCS(gcsUri, encoding, sampleRateHertz, languageCode);

      // Clean up temp file
      try {
        await cloudStorage.deleteFile(`transcription-temp/${filename}`);
        console.log('🗑️ Temporary file deleted');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to delete temporary file:', cleanupError.message);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in long audio transcription:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe audio from Google Cloud Storage
   * @param {string} gcsUri - GCS URI (gs://bucket/file)
   * @param {string} encoding - Audio encoding
   * @param {number} sampleRateHertz - Sample rate
   * @param {string} languageCode - Language code
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFromGCS(gcsUri, encoding = 'WEBM_OPUS', sampleRateHertz = 48000, languageCode = 'en-US') {
    if (!this.isConfigured) {
      throw new Error('Speech-to-Text is not configured');
    }

    try {
      console.log(`🎤 Starting audio transcription from GCS: ${gcsUri}`);

      const audio = {
        uri: gcsUri
      };

      const config = {
        encoding,
        sampleRateHertz,
        languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
        model: 'default',
        useEnhanced: true
      };

      const request = {
        audio,
        config
      };

      // For longer audio files, use long running recognition
      const [operation] = await this.client.longRunningRecognize(request);

      console.log('⏳ Waiting for transcription to complete...');
      const [response] = await operation.promise();

      const transcription = response.results
        .map(result => result.alternatives[0])
        .filter(alt => alt.transcript);

      if (transcription.length === 0) {
        return {
          transcript: '',
          confidence: 0,
          words: [],
          duration: 0
        };
      }

      const fullTranscript = transcription
        .map(alt => alt.transcript)
        .join(' ');

      const avgConfidence = transcription.reduce((sum, alt) => sum + (alt.confidence || 0), 0) / transcription.length;

      const words = [];
      transcription.forEach(alt => {
        if (alt.words) {
          alt.words.forEach(wordInfo => {
            words.push({
              word: wordInfo.word,
              startTime: this.convertDuration(wordInfo.startTime),
              endTime: this.convertDuration(wordInfo.endTime),
              confidence: wordInfo.confidence || 0
            });
          });
        }
      });

      const duration = words.length > 0
        ? words[words.length - 1].endTime
        : 0;

      console.log(`✅ Transcription complete. Length: ${fullTranscript.length} characters`);

      return {
        transcript: fullTranscript.trim(),
        confidence: avgConfidence,
        words,
        duration,
        wordCount: words.length
      };

    } catch (error) {
      console.error('❌ Error transcribing audio from GCS:', error.message);
      throw error;
    }
  }

  /**
   * Analyze speech patterns from transcription
   * @param {Object} transcriptionResult - Result from transcribeAudio
   * @returns {Object} Speech pattern analysis
   */
  analyzeSpeechPatterns(transcriptionResult) {
    const { transcript, words, duration } = transcriptionResult;

    // Ensure duration is a valid number
    const validDuration = typeof duration === 'number' && !isNaN(duration) ? duration : 0;

    if (!transcript || words.length === 0) {
      return {
        wordsPerMinute: 0,
        fillerWords: [],
        fillerWordCount: 0,
        fillerWordPercentage: '0.00',
        averagePauseDuration: '0.00',
        longPauses: 0,
        confidence: '0.00',
        totalWords: 0,
        duration: '0.00'
      };
    }

    // Calculate words per minute
    const wordsPerMinute = validDuration > 0
      ? Math.round((words.length / validDuration) * 60)
      : 0;

    // Detect filler words
    const fillerWordsList = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'i mean'];
    const fillerWords = [];
    const lowerTranscript = transcript.toLowerCase();

    fillerWordsList.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerTranscript.match(regex);
      if (matches) {
        fillerWords.push({
          word: filler,
          count: matches.length
        });
      }
    });

    const fillerWordCount = fillerWords.reduce((sum, f) => sum + f.count, 0);

    // Calculate pauses between words
    const pauses = [];
    for (let i = 1; i < words.length; i++) {
      const pauseDuration = words[i].startTime - words[i - 1].endTime;
      if (pauseDuration > 0) {
        pauses.push(pauseDuration);
      }
    }

    const averagePauseDuration = pauses.length > 0
      ? pauses.reduce((sum, p) => sum + p, 0) / pauses.length
      : 0;

    // Detect long pauses (> 2 seconds)
    const longPauses = pauses.filter(p => p > 2);

    // Calculate average confidence
    const avgConfidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;

    return {
      wordsPerMinute,
      fillerWords,
      fillerWordCount,
      fillerWordPercentage: ((fillerWordCount / words.length) * 100).toFixed(2),
      averagePauseDuration: averagePauseDuration.toFixed(2),
      longPauses: longPauses.length,
      confidence: (avgConfidence * 100).toFixed(2),
      totalWords: words.length,
      duration: validDuration.toFixed(2)
    };
  }

  /**
   * Convert protobuf duration to seconds
   */
  convertDuration(duration) {
    if (!duration) return 0;
    return (duration.seconds || 0) + (duration.nanos || 0) / 1e9;
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
module.exports = new SpeechToTextService();
