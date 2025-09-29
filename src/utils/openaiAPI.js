// OpenAI API integration (client-side). Ensure you understand the risks of exposing API keys in the browser.

class OpenAIAPI {
  static get API_KEY() {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }

  static get MODEL() {
    return import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
  }

  static isApiKeyAvailable() {
    const key = this.API_KEY;
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    return !!trimmed && !trimmed.toLowerCase().includes('your_');
  }

  static async chat(messages, options = {}) {
    if (!this.isApiKeyAvailable()) {
      throw new Error('OpenAI API key is missing or invalid.');
    }
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.API_KEY}`,
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 300,
      })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`OpenAI request failed with status ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Unexpected OpenAI response shape');
    return content.trim();
  }

  static async generateQuestion(candidateProfile, questionNumber, difficulty) {
    const prompt = `You are an expert technical interviewer. Generate one concise interview question only.\n\nRole: ${candidateProfile.role}\nDifficulty: ${difficulty}\nQuestion Number: ${questionNumber} of 6\nFocus: ${difficulty === 'Easy' ? 'fundamentals of React/Node.js' : difficulty === 'Medium' ? 'practical application and reasoning' : 'advanced concepts, trade-offs, and architecture'}\n\nConstraints:\n- Output ONLY the question text.\n- Do not include numbering, labels, code fences, or explanations.`;
    const messages = [
      { role: 'system', content: 'You are a helpful, concise technical interviewer.' },
      { role: 'user', content: prompt }
    ];
    return await this.chat(messages, { temperature: 0.7, max_tokens: 200 });
  }

  static async generateQuestionsBatch(candidateProfile) {
    const prompt = `You are an expert technical interviewer. Generate six interview questions for a ${candidateProfile.role} role.

Constraints:
- Output strictly as JSON array with 6 objects.
- Schema for each item: {"text": "<question>", "difficulty": "Easy|Medium|Hard"}
- Provide exactly: 2 Easy, 2 Medium, 2 Hard in that order.
- Questions must be concise and self-contained; no numbering or extra commentary.`;
    const messages = [
      { role: 'system', content: 'Return only valid JSON as specified.' },
      { role: 'user', content: prompt }
    ];
    const content = await this.chat(messages, { temperature: 0.6, max_tokens: 800 });
    const cleaned = content.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr) || arr.length !== 6) throw new Error('Batch question generation returned unexpected structure.');
    return arr.map((q, idx) => ({
      id: Date.now() + idx,
      text: q.text,
      difficulty: q.difficulty,
      timeLimit: q.difficulty === 'Easy' ? 20 : q.difficulty === 'Medium' ? 60 : 120,
    }));
  }

  static async evaluateAnswer(question, answer, difficulty) {
    const prompt = `You are an expert technical interviewer. Evaluate the candidate's answer strictly and return JSON only.\n\nQuestion: ${question}\nAnswer: ${answer}\nDifficulty: ${difficulty}\n\nScoring rubric (0-10):\n- 9-10: Correct, complete, precise, strong reasoning/examples\n- 7-8: Mostly correct, minor gaps\n- 5-6: Partial understanding, notable gaps\n- 3-4: Significant misunderstandings\n- 0-2: Incorrect or irrelevant\n\nOutput JSON (no prose): {"score": <0-10 integer>, "feedback": "<1-3 sentences explaining correctness and missing pieces>"}`;
    const messages = [
      { role: 'system', content: 'Return JSON only.' },
      { role: 'user', content: prompt }
    ];
    const content = await this.chat(messages, { temperature: 0.2, max_tokens: 200 });
    try {
      const cleaned = content.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
      const json = JSON.parse(cleaned);
      return {
        score: json.score,
        feedback: json.feedback
      };
    } catch (e) {
      throw new Error('Non-JSON evaluation response');
    }
  }

  static async generateSummary(candidateProfile, questions, answers, finalScore) {
    const prompt = `You are an expert interviewer. Produce a concise evaluation summary.\n\nRole: ${candidateProfile.role}\nFinal Score (0-100): ${finalScore}\nQuestions (with difficulty): ${JSON.stringify(questions.map(q => ({ text: q.text, difficulty: q.difficulty })), null, 2)}\nAnswers (with per-question scores if present): ${JSON.stringify(answers, null, 2)}\n\nRequirements:\n- Start with a single-sentence overall verdict referencing the score.\n- List 2-4 strengths referencing topics from higher-scored answers.\n- List 2-4 areas for improvement referencing topics from lower-scored or missing answers.\n- End with a brief hiring recommendation.`;
    const messages = [
      { role: 'system', content: 'Be concise and structured.' },
      { role: 'user', content: prompt }
    ];
    return await this.chat(messages, { temperature: 0.4, max_tokens: 500 });
  }
}

export default OpenAIAPI;


