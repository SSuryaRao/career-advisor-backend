const vertexAI = require('./vertexAI');
const { getDomainById } = require('../config/interviewDomains');

class IntelligentInterviewService {
  /**
   * Generate interview questions for a specific domain
   * @param {Object} params - Question generation parameters
   * @returns {Promise<Array>} Array of generated questions
   */
  async generateQuestions(params) {
    const {
      domainId,
      level,
      count = 5,
      previousQuestions = []
    } = params;

    try {
      console.log(`🤖 Generating ${count} questions for domain: ${domainId}, level: ${level}`);

      const domain = getDomainById(domainId);

      if (!domain) {
        throw new Error(`Domain not found: ${domainId}`);
      }

      const prompt = this.buildQuestionGenerationPrompt({
        domain,
        level,
        count,
        previousQuestions
      });

      const questionsText = await vertexAI.generateContent(prompt);
      const questions = this.parseQuestions(questionsText, domain, level);

      console.log(`✅ Generated ${questions.length} questions`);

      return questions;

    } catch (error) {
      console.error('❌ Error generating questions:', error.message);
      throw error;
    }
  }

  /**
   * Generate a single follow-up question based on previous answer
   * @param {Object} params - Follow-up question parameters
   * @returns {Promise<Object>} Generated follow-up question
   */
  async generateFollowUpQuestion(params) {
    const {
      domainId,
      level,
      previousQuestion,
      previousAnswer
    } = params;

    try {
      console.log('🤖 Generating follow-up question...');

      const domain = getDomainById(domainId);

      const prompt = this.buildFollowUpPrompt({
        domain,
        level,
        previousQuestion,
        previousAnswer
      });

      const questionText = await vertexAI.generateContent(prompt);
      const question = this.parseFollowUpQuestion(questionText, domain, level);

      console.log('✅ Follow-up question generated');

      return question;

    } catch (error) {
      console.error('❌ Error generating follow-up question:', error.message);
      throw error;
    }
  }

  /**
   * Build prompt for question generation
   */
  buildQuestionGenerationPrompt({ domain, level, count, previousQuestions }) {
    const previousQuestionsText = previousQuestions.length > 0
      ? `\n\n**Previously Asked Questions (avoid duplicating these):**\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    return `You are an expert technical interviewer for ${domain.name} positions.

**Context:**
- Domain: ${domain.name}
- Description: ${domain.description}
- Level: ${level}
- Question Areas: ${domain.questionAreas.join(', ')}
- Key Technologies: ${domain.keywords.join(', ')}
${previousQuestionsText}

**Task:** Generate ${count} high-quality, realistic interview questions appropriate for a ${level} ${domain.name} position.

**Requirements:**
1. Questions should be practical and scenario-based where appropriate
2. Mix of conceptual, technical, and problem-solving questions
3. Appropriate difficulty for ${level} level
4. Cover different areas from: ${domain.questionAreas.slice(0, 5).join(', ')}
5. Each question should be clear and specific

**Format your response EXACTLY as follows:**

QUESTION 1:
[Question text]
DIFFICULTY: [Easy/Medium/Hard]
CATEGORY: [Category from question areas]
KEYWORDS: [keyword1, keyword2, keyword3]

QUESTION 2:
[Question text]
DIFFICULTY: [Easy/Medium/Hard]
CATEGORY: [Category from question areas]
KEYWORDS: [keyword1, keyword2, keyword3]

[Continue for all ${count} questions]`;
  }

  /**
   * Build prompt for follow-up question
   */
  buildFollowUpPrompt({ domain, level, previousQuestion, previousAnswer }) {
    return `You are an expert technical interviewer for ${domain.name} positions.

**Context:**
- Domain: ${domain.name}
- Level: ${level}

**Previous Question:** ${previousQuestion}

**Candidate's Answer:** ${previousAnswer}

**Task:** Generate ONE insightful follow-up question that:
1. Builds upon the candidate's answer
2. Explores their understanding more deeply
3. Is appropriate for ${level} level
4. Relates to ${domain.name}

**Format:**

QUESTION:
[Follow-up question text]
DIFFICULTY: [Easy/Medium/Hard]
CATEGORY: [Category]
KEYWORDS: [keyword1, keyword2, keyword3]`;
  }

  /**
   * Parse generated questions from AI response
   */
  parseQuestions(questionsText, domain, level) {
    const questions = [];

    try {
      // Split by QUESTION markers
      const questionBlocks = questionsText.split(/QUESTION \d+:/i).filter(block => block.trim().length > 0);

      for (const block of questionBlocks) {
        const question = this.parseQuestionBlock(block, domain, level);
        if (question) {
          questions.push(question);
        }
      }

    } catch (error) {
      console.error('Error parsing questions:', error.message);
    }

    return questions;
  }

  /**
   * Parse a single question block
   */
  parseQuestionBlock(block, domain, level) {
    try {
      // Extract question text (everything before DIFFICULTY)
      const questionMatch = block.match(/^([\s\S]*?)DIFFICULTY:/i);
      if (!questionMatch) return null;

      const questionText = questionMatch[1].trim();

      // Extract difficulty
      const difficultyMatch = block.match(/DIFFICULTY:\s*\[?(Easy|Medium|Hard)\]?/i);
      const difficulty = difficultyMatch ? difficultyMatch[1] : 'Medium';

      // Extract category
      const categoryMatch = block.match(/CATEGORY:\s*\[?([^\]\n]+)\]?/i);
      const category = categoryMatch ? categoryMatch[1].trim() : domain.questionAreas[0];

      // Extract keywords
      const keywordsMatch = block.match(/KEYWORDS:\s*\[?([^\]\n]+)\]?/i);
      const keywords = keywordsMatch
        ? keywordsMatch[1].split(',').map(k => k.trim())
        : [];

      return {
        questionText,
        difficulty,
        category,
        keywords,
        domainId: domain.id,
        domainName: domain.name,
        level
      };

    } catch (error) {
      console.error('Error parsing question block:', error.message);
      return null;
    }
  }

  /**
   * Parse follow-up question
   */
  parseFollowUpQuestion(questionText, domain, level) {
    const question = this.parseQuestionBlock(questionText, domain, level);

    if (!question) {
      // Fallback: return the text as is
      return {
        questionText: questionText.replace(/QUESTION:/i, '').trim(),
        difficulty: 'Medium',
        category: 'Follow-up',
        keywords: [],
        domainId: domain.id,
        domainName: domain.name,
        level,
        isFollowUp: true
      };
    }

    return {
      ...question,
      isFollowUp: true
    };
  }

  /**
   * Get suggested question areas for a domain
   */
  getQuestionAreas(domainId) {
    const domain = getDomainById(domainId);
    return domain?.questionAreas || [];
  }

  /**
   * Validate question quality
   */
  validateQuestion(question) {
    const errors = [];

    if (!question.questionText || question.questionText.length < 10) {
      errors.push('Question text is too short');
    }

    if (!['Easy', 'Medium', 'Hard'].includes(question.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if (!question.category) {
      errors.push('Missing category');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate example answer for a question (for testing/reference)
   */
  async generateExampleAnswer(questionText, domainId, level) {
    try {
      const domain = getDomainById(domainId);

      const prompt = `You are a ${level} ${domain.name} professional.

**Question:** ${questionText}

**Task:** Provide a high-quality example answer that demonstrates:
1. Technical knowledge appropriate for ${level} level
2. Clear communication
3. Practical experience
4. Industry best practices

Keep the answer concise but comprehensive (2-3 paragraphs).`;

      const exampleAnswer = await vertexAI.generateContent(prompt);

      return exampleAnswer.trim();

    } catch (error) {
      console.error('Error generating example answer:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new IntelligentInterviewService();
