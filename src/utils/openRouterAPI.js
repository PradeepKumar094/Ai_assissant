import axios from 'axios';

export class OpenRouterAPI {
  static apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
  
  static isApiKeyAvailable() {
    return !!this.apiKey && this.apiKey !== 'undefined';
  }
  
  static async checkApiKey() {
    if (!this.apiKey || this.apiKey === 'undefined' || this.apiKey.trim() === '') {
      return false;
    }
    return true;
  }

  static async generateQuestions(position, difficulty, count = 1) {
    if (!await this.checkApiKey()) return [];
    
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: "anthropic/claude-3-opus:beta",
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer. Generate challenging and relevant interview questions."
            },
            {
              role: "user",
              content: `Generate ${count} ${difficulty} technical interview questions for a ${position} position. Format as a JSON array of objects with 'question', 'difficulty', and 'timeLimit' (in seconds) properties. Make timeLimit 20 for easy, 60 for medium, and 120 for hard questions.`
            }
          ],
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Interview Assistant'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      try {
        const parsedContent = JSON.parse(content);
        // Handle different response formats
        const questions = Array.isArray(parsedContent) ? parsedContent : 
                         parsedContent.questions || parsedContent.data || [];
        return questions.map(q => ({
          question: q.question || q.text || q.content || '',
          difficulty: q.difficulty || difficulty,
          timeLimit: q.timeLimit || (difficulty === 'easy' ? 20 : difficulty === 'medium' ? 60 : 120)
        })).filter(q => q.question);
      } catch (e) {
        // Try to extract questions from plain text
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const questions = [];
        for (let i = 0; i < Math.min(lines.length, count); i++) {
          questions.push({
            question: lines[i].replace(/^\d+\.\s*/, '').trim(),
            difficulty: difficulty,
            timeLimit: difficulty === 'easy' ? 20 : difficulty === 'medium' ? 60 : 120
          });
        }
        return questions;
      }
    } catch (error) {
      console.error('Error generating questions with OpenRouter:', error);
      // Handle specific error cases
      if (error.response) {
        if (error.response.status === 402) {
          console.error('OpenRouter API error: Payment required. Please check your account and billing information.');
        } else if (error.response.status === 401) {
          console.error('OpenRouter API error: Unauthorized. Please check your API key.');
        } else if (error.response.status === 429) {
          console.error('OpenRouter API error: Rate limit exceeded. Please try again later.');
        }
      }
      return [];
    }
  }

  static async evaluateAnswer(question, answer, position) {
    if (!await this.checkApiKey()) {
      return { score: 50, feedback: "Using default evaluation due to missing API key." };
    }

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: "anthropic/claude-3-sonnet:beta",
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer evaluating candidate responses. Always respond with valid JSON."
            },
            {
              role: "user",
              content: `Evaluate this answer for a ${position} position interview question.
              
Question: ${question}

Candidate's Answer: ${answer}

Provide feedback and a score from 0-10 based on technical accuracy, completeness, and clarity. Format your response as a JSON object with 'score' (number) and 'feedback' (string) properties. Only return the JSON object, nothing else.`
            }
          ],
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Interview Assistant'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      try {
        // Clean up the content to ensure it's valid JSON
        let cleanedContent = content.trim();
        // Remove any markdown code block markers
        cleanedContent = cleanedContent.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
        const result = JSON.parse(cleanedContent);
        return {
          score: Math.max(0, Math.min(10, result.score || 5)),
          feedback: result.feedback || "No feedback provided."
        };
      } catch (e) {
        // Try to extract score and feedback from plain text
        const scoreMatch = content.match(/score.*?(\d+)/i);
        const score = scoreMatch ? Math.max(0, Math.min(10, parseInt(scoreMatch[1]))) : 5;
        const feedbackMatch = content.match(/feedback[:\s]*([^.]+\.)/i);
        const feedback = feedbackMatch ? feedbackMatch[1] : "Default feedback based on score.";
        return { score, feedback };
      }
    } catch (error) {
      console.error('Error evaluating answer with OpenRouter:', error);
      // Handle specific error cases
      if (error.response && error.response.status === 402) {
        console.error('OpenRouter API error: Payment required. Please check your account and billing information.');
      }
      return { score: 5, feedback: "Error processing evaluation. Please try again." };
    }
  }

  static async generateSummary(candidateData, position) {
    if (!await this.checkApiKey()) {
      return "Using default summary due to missing API key.";
    }

    try {
      // Format the candidate's answers for the prompt
      const answersText = candidateData.answers.map((a, i) => {
        const question = candidateData.questions[i] || { question: "Unknown question" };
        return `Question ${i+1}: ${question.question}
Answer: ${a.text}
Score: ${a.score || 'N/A'}/10
Feedback: ${a.feedback || 'No feedback'}`;
      }).join('\n\n');

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: "anthropic/claude-3-sonnet:beta",
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer providing candidate evaluations. Provide a comprehensive summary."
            },
            {
              role: "user",
              content: `Generate a comprehensive summary evaluation for a ${position} candidate based on their interview performance.

Candidate: ${candidateData.name}
Position: ${position}
Overall Score: ${candidateData.score || 'N/A'}/100

Interview Questions and Answers:
${answersText}

Provide a detailed evaluation summary (200-300 words) covering technical skills, strengths, weaknesses, and hiring recommendation.`
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Interview Assistant'
          }
        }
      );

      return response.data.choices[0].message.content || "No summary generated.";
    } catch (error) {
      console.error('Error generating summary with OpenRouter:', error);
      // Handle specific error cases
      if (error.response && error.response.status === 402) {
        console.error('OpenRouter API error: Payment required. Please check your account and billing information.');
      }
      return "Error generating candidate summary. Please try again.";
    }
  }
}

export default OpenRouterAPI;