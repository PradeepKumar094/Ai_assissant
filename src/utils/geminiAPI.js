// Gemini API integration
// This implementation will use the actual Gemini API when a key is provided
// Otherwise, it will fall back to mock data

class GeminiAPI {
  // Get API key from environment variables
  static get API_KEY() {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  
  static get MODEL() {
    // Allow overriding the model from env, default to gemini-pro
    return import.meta.env.VITE_GEMINI_MODEL || 'gemini-pro';
  }

  static get API_URL() {
    return `https://generativelanguage.googleapis.com/v1/models/${this.MODEL}:generateContent?key=${this.API_KEY}`;
  }
  
  // Check if API key is available
  static isApiKeyAvailable() {
    const key = this.API_KEY;
    // Treat placeholder, empty, or clearly invalid keys as unavailable to force mock
    if (!key) return false;
    if (typeof key !== 'string') return false;
    const trimmed = key.trim();
    if (!trimmed || trimmed.toLowerCase().includes('your_') || trimmed.length < 10) return false;
    return true;
  }

  static extractTextFromResponse(data) {
    // Surface safety blocks clearly
    if (data && data.promptFeedback && data.promptFeedback.blockReason) {
      const reason = data.promptFeedback.blockReason;
      throw new Error(`Response blocked by safety filters: ${reason}`);
    }
    try {
      const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
      if (!candidates.length) throw new Error('No candidates in response');
      const candidate = candidates[0];
      // Standard v1 shape
      let parts = candidate?.content?.parts;
      // Some variants may wrap content in an array
      if (!Array.isArray(parts) && Array.isArray(candidate?.content)) {
        parts = candidate.content[0]?.parts;
      }
      if (Array.isArray(parts)) {
        const texts = parts
          .map(p => typeof p?.text === 'string' ? p.text : '')
          .filter(Boolean);
        const joined = texts.join('\n').trim();
        if (joined) return joined;
      }
      // Fallbacks seen in some responses
      if (typeof candidate?.output_text === 'string') {
        const t = candidate.output_text.trim();
        if (t) return t;
      }
      if (typeof data?.text === 'string') {
        const t = data.text.trim();
        if (t) return t;
      }
    } catch (_) {}
    throw new Error('Unexpected Gemini response shape');
  }

  static async postWithModelFallback(body, generationConfig) {
    const candidateModels = [
      this.MODEL,
      'gemini-2.5-flash-latest',
      'gemini-2.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ];
    let lastError;
    const tried = [];
    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.API_KEY}`;
      try {
        tried.push(model);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: body.contents, generationConfig })
        });
        if (!response.ok) {
          // Retry on 404 with next model; throw for other errors
          if (response.status === 404) {
            lastError = new Error(`Model not found (404) for ${model}`);
            continue;
          }
          const errText = await response.text();
          throw new Error(`API request failed with status ${response.status}: ${errText}`);
        }
        return await response.json();
      } catch (err) {
        lastError = err;
        // Try next model
      }
    }
    const triedMsg = tried.length ? ` Tried models: ${tried.join(', ')}` : '';
    throw new Error(`${lastError?.message || 'All Gemini model attempts failed.'}${triedMsg}`);
  }

  // Generate interview questions using Gemini API
  static async generateQuestion(candidateProfile, questionNumber, difficulty) {
    if (!this.isApiKeyAvailable()) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    
    try {
      const prompt = `You are an expert technical interviewer. Generate one concise interview question only.

Role: ${candidateProfile.role}
Difficulty: ${difficulty}
Question Number: ${questionNumber} of 6
Focus: ${difficulty === 'Easy' ? 'fundamentals of React/Node.js' : difficulty === 'Medium' ? 'practical application and reasoning' : 'advanced concepts, trade-offs, and architecture'}

Constraints:
- Output ONLY the question text.
- Do not include numbering, labels, code fences, or explanations.
- Avoid duplicating prior questions if possible.
`;

      const data = await this.postWithModelFallback({
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 256
      });
      return this.extractTextFromResponse(data);
    } catch (err) {
      console.error('Error generating question with Gemini API:', err);
      throw err;
    }
  }

  // Evaluate candidate answers using Gemini API
  static async evaluateAnswer(question, answer, difficulty) {
    if (!this.isApiKeyAvailable()) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    
    try {
      const prompt = `You are an expert technical interviewer.
Evaluate the candidate's answer strictly and return JSON only.

Question: ${question}
Answer: ${answer}
Difficulty: ${difficulty}

Scoring rubric (0-10):
- 9-10: Correct, complete, precise, strong reasoning/examples
- 7-8: Mostly correct, minor gaps
- 5-6: Partial understanding, notable gaps
- 3-4: Significant misunderstandings
- 0-2: Incorrect or irrelevant

Output JSON (no prose): {"score": <0-10 integer>, "feedback": "<1-3 sentences explaining correctness and missing pieces>"}`;

      const data = await this.postWithModelFallback({
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        temperature: 0.2,
        maxOutputTokens: 256
      });
      const responseText = this.extractTextFromResponse(data);
      
      // Try to parse as JSON, fallback to text parsing if needed
      try {
        const jsonData = JSON.parse(responseText);
        return {
          score: jsonData.score,
          feedback: jsonData.feedback
        };
      } catch (e) {
        // Attempt to strip code fences if present
        const stripped = responseText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
        const jsonData = JSON.parse(stripped);
        return {
          score: jsonData.score,
          feedback: jsonData.feedback
        };
      }
    } catch (err) {
      console.error('Error evaluating answer with Gemini API:', err);
      throw err;
    }
  }

  // Generate final interview summary using Gemini API
  static async generateSummary(candidateProfile, questions, answers, finalScore) {
    if (!this.isApiKeyAvailable()) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    
    try {
      const prompt = `You are an expert interviewer. Produce a concise evaluation summary.

Role: ${candidateProfile.role}
Final Score (0-100): ${finalScore}
Questions (with difficulty): ${JSON.stringify(questions.map(q => ({ text: q.text, difficulty: q.difficulty })), null, 2)}
Answers (with per-question scores if present): ${JSON.stringify(answers, null, 2)}

Requirements:
- Start with a single-sentence overall verdict referencing the score.
- List 2-4 strengths referencing topics from higher-scored answers.
- List 2-4 areas for improvement referencing topics from lower-scored or missing answers.
- End with a brief hiring recommendation.
`;

      const data = await this.postWithModelFallback({
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        temperature: 0.4,
        maxOutputTokens: 512
      });
      return this.extractTextFromResponse(data);
    } catch (err) {
      console.error('Error generating summary with Gemini API:', err);
      throw err;
    }
  }

  // Batch-generate 6 questions (2 Easy, 2 Medium, 2 Hard) as JSON in one call
  static async generateQuestionsBatch(candidateProfile) {
    if (!this.isApiKeyAvailable()) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    const prompt = `You are an expert technical interviewer. Generate six interview questions for a ${candidateProfile.role} role.

Constraints:
- Output strictly as JSON array with 6 objects.
- Schema for each item: {"text": "<question>", "difficulty": "Easy|Medium|Hard"}
- Provide exactly: 2 Easy, 2 Medium, 2 Hard in that order.
- Questions must be concise and self-contained; no numbering or extra commentary.`;
    try {
      const data = await this.postWithModelFallback({
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        temperature: 0.6,
        maxOutputTokens: 800
      });
      const responseText = this.extractTextFromResponse(data);
      const cleaned = responseText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      const arr = JSON.parse(cleaned);
      if (!Array.isArray(arr) || arr.length !== 6) {
        throw new Error('Batch question generation returned unexpected structure.');
      }
      const getTimeLimit = (difficulty) => difficulty === 'Easy' ? 20 : difficulty === 'Medium' ? 60 : 120;
      return arr.map((q, idx) => ({
        id: Date.now() + idx,
        text: q.text,
        difficulty: q.difficulty,
        timeLimit: getTimeLimit(q.difficulty),
      }));
    } catch (err) {
      console.error('Error generating batch questions with Gemini API:', err);
      throw err;
    }
  }

  // Mock question generation
  static generateMockQuestion(questionNumber, difficulty) {
    const mockQuestions = {
      'Easy': [
        "What is React and what are its main features?",
        "Explain the difference between state and props in React.",
        "What is the virtual DOM and how does it work?",
        "What are the different lifecycle methods in React?",
        "What is JSX and how is it different from HTML?",
        "What are React Hooks and why were they introduced?"
      ],
      'Medium': [
        "How does React's virtual DOM work and why is it important?",
        "Explain middleware in Express.js and give an example of how to use it.",
        "What is the difference between controlled and uncontrolled components in React?",
        "How would you optimize the performance of a React application?",
        "Explain the concept of middleware in Redux and how it's used.",
        "What are the different ways to manage state in a React application?"
      ],
      'Hard': [
        "How would you optimize the performance of a React application?",
        "Describe how you would design a RESTful API for a social media platform using Node.js.",
        "Explain the concept of server-side rendering and how it can be implemented in React.",
        "How would you implement authentication and authorization in a full-stack application?",
        "Describe the architecture of a microservices-based application and how it differs from a monolithic architecture.",
        "How would you handle error boundaries and error recovery in a large React application?"
      ]
    };

    const questions = mockQuestions[difficulty] || mockQuestions['Medium'];
    const index = questionNumber % questions.length;
    return questions[index];
  }

  // Mock evaluation generation
  static generateMockEvaluation(difficulty) {
    const mockScores = {
      'Easy': Math.floor(Math.random() * 3) + 8, // 8-10 for easy questions
      'Medium': Math.floor(Math.random() * 4) + 6, // 6-9 for medium questions
      'Hard': Math.floor(Math.random() * 5) + 5 // 5-9 for hard questions
    };

    const score = mockScores[difficulty] || 7;
    
    const feedbacks = [
      `Good answer demonstrating understanding of the concept. ${
        score >= 8 ? 'Excellent explanation with relevant examples.' : 
        score >= 6 ? 'Good understanding but could include more specific details.' : 
        'Basic understanding shown but needs more depth and examples.'
      }`,
      `Well structured response with clear explanations. ${
        score >= 8 ? 'Demonstrates expert knowledge in this area.' : 
        score >= 6 ? 'Shows solid understanding with room for improvement.' : 
        'Some understanding but needs more comprehensive knowledge.'
      }`,
      `Thoughtful response that addresses the key points. ${
        score >= 8 ? 'Exceptional insight and depth of knowledge.' : 
        score >= 6 ? 'Good grasp of fundamentals with practical application.' : 
        'Basic comprehension with opportunities to elaborate.'
      }`
    ];
    
    const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
    
    return {
      score: score,
      feedback: feedback
    };
  }

  // Mock summary generation
  static generateMockSummary() {
    const strengths = [
      "Strong understanding of React fundamentals",
      "Good problem-solving approach",
      "Clear communication skills",
      "Knowledge of modern development practices",
      "Experience with state management solutions",
      "Understanding of RESTful API design"
    ];
    
    const improvements = [
      "Could provide more specific examples",
      "Needs deeper understanding of advanced concepts",
      "Could improve on performance optimization techniques",
      "Would benefit from more hands-on experience",
      "Should focus on best practices and design patterns",
      "Could enhance knowledge of testing strategies"
    ];
    
    const recommendations = [
      "Strong candidate with good technical skills",
      "Promising candidate with potential for growth",
      "Competent candidate suitable for mid-level positions",
      "Entry-level candidate with foundational knowledge"
    ];
    
    // Randomly select 2-3 strengths and 2-3 areas for improvement
    const selectedStrengths = strengths.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);
    const selectedImprovements = improvements.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);
    const recommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
    
    return `Candidate demonstrated solid technical skills and communication abilities throughout the interview.

Strengths:
${selectedStrengths.map(s => `- ${s}`).join('\n')}

Areas for Improvement:
${selectedImprovements.map(i => `- ${i}`).join('\n')}

Overall Recommendation:
${recommendation}`;
  }
}

export default GeminiAPI;