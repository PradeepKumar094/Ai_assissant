import axios from 'axios';

// Create a custom axios instance with better error handling
const perplexityAxios = axios.create({
  baseURL: 'https://api.perplexity.ai',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add response interceptor for better error handling
perplexityAxios.interceptors.response.use(
  response => response,
  error => {
    console.error('Axios error:', error);
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('General error:', error.message);
    }
    return Promise.reject(error);
  }
);

export class PerplexityAPI {
  static apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY || '';
  
  static isApiKeyAvailable() {
    console.log('Checking API key availability...');
    console.log('Raw API key value:', this.apiKey);
    console.log('API key type:', typeof this.apiKey);
    console.log('API key length:', this.apiKey ? this.apiKey.length : 0);
    
    // Check if API key exists and is not the default placeholder
    const key = this.apiKey;
    if (!key) {
      console.warn('Perplexity API key is null or undefined');
      return false;
    }
    
    if (key === 'undefined') {
      console.warn('Perplexity API key is the string "undefined"');
      return false;
    }
    
    const trimmedKey = key.trim();
    if (trimmedKey === '') {
      console.warn('Perplexity API key is empty or whitespace');
      return false;
    }
    
    if (trimmedKey === 'your_perplexity_api_key_here') {
      console.warn('Perplexity API key is using default placeholder');
      return false;
    }
    
    // Check if API key has the correct prefix
    if (!trimmedKey.startsWith('pplx-')) {
      console.warn('Perplexity API key should start with "pplx-"');
      console.log('API key prefix:', trimmedKey.substring(0, 10) + '...');
      return false;
    }
    
    // Check if API key has the right length (should be around 50+ characters)
    if (trimmedKey.length < 30) {
      console.warn('Perplexity API key seems too short');
      return false;
    }
    
    console.log('API key validation passed');
    return true;
  }
  
  static async checkApiKey() {
    // Debug log to check if API key is loaded
    console.log('Perplexity API Key Available:', this.isApiKeyAvailable());
    if (this.apiKey) {
      const trimmedKey = this.apiKey.trim();
      console.log('API Key prefix:', trimmedKey.substring(0, 10) + '...');
      console.log('API Key length:', trimmedKey.length);
    }
    
    const key = this.apiKey;
    if (!key || key === 'undefined' || key.trim() === '') {
      console.warn('Perplexity API key is missing or invalid');
      return false;
    }
    
    const trimmedKey = key.trim();
    
    // Check if API key has the correct prefix
    if (!trimmedKey.startsWith('pplx-')) {
      console.warn('Perplexity API key should start with "pplx-"');
      return false;
    }
    
    return true;
  }

  static async testConnection() {
    console.log('Starting Perplexity API connection test...');
    
    if (!await this.checkApiKey()) {
      console.log('API key check failed, returning failure');
      return { success: false, error: 'API key not available' };
    }
    
    // First, let's test basic network connectivity
    try {
      console.log('Testing basic network connectivity to Perplexity API...');
      const connectivityTest = await fetch('https://api.perplexity.ai/', { method: 'HEAD', mode: 'no-cors' });
      console.log('Connectivity test result:', connectivityTest);
    } catch (connectivityError) {
      console.warn('Network connectivity test failed:', connectivityError);
    }
    
    try {
      console.log('Testing Perplexity API connection...');
      console.log('Using API key:', this.apiKey.substring(0, 10) + '...');
      
      const response = await perplexityAxios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: "pplx-7b-online",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant."
            },
            {
              role: "user",
              content: "Hello, this is a test message. Please respond with 'Test successful' and nothing else."
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Test API response status:', response.status);
      
      if (response.status === 200) {
        const content = response.data.choices[0].message.content;
        console.log('Test API response content:', content);
        return { success: true, message: content };
      } else {
        console.log('Test API returned non-200 status:', response.status);
        return { success: false, error: `API returned status ${response.status}` };
      }
    } catch (error) {
      console.error('Error testing Perplexity API connection:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        return { success: false, error: `API error: ${error.response.status} - ${JSON.stringify(error.response.data)}` };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return { success: false, error: 'No response received from API' };
      } else {
        console.error('General error:', error.message);
        return { success: false, error: error.message };
      }
    }
  }

  static async generateQuestions(position, difficulty, count = 1) {
    if (!await this.checkApiKey()) {
      console.warn('Perplexity API key not available, returning default questions');
      return [];
    }
    
    // List of available models (in order of preference)
    const models = [
      "pplx-7b-online",
      "pplx-70b-online"
    ];
    
    for (const model of models) {
      try {
        console.log(`Attempting to generate questions with model: ${model}`);
        
        // Add more detailed request logging
        const requestData = {
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer. Generate challenging and relevant interview questions."
            },
            {
              role: "user",
              content: `Generate ${count} ${difficulty} technical interview questions for a ${position} position. Format as a JSON array of objects with 'question', 'difficulty', and 'timeLimit' (in seconds) properties. Make timeLimit 20 for easy, 60 for medium, and 120 for hard questions.`
            }
          ]
        };
        
        console.log('Request data:', JSON.stringify(requestData, null, 2));
        
        const response = await perplexityAxios.post(
          'https://api.perplexity.ai/chat/completions',
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`Perplexity API response status for ${model}:`, response.status);
        console.log(`Perplexity API response headers for ${model}:`, response.headers);

        if (response.status === 200 && response.data && response.data.choices && response.data.choices.length > 0) {
          const content = response.data.choices[0].message.content;
          console.log(`Perplexity API response content length for ${model}:`, content.length);
          console.log(`Perplexity API response content preview for ${model}:`, content.substring(0, 200) + '...');
          
          try {
            const parsedContent = JSON.parse(content);
            // Handle different response formats
            const questions = Array.isArray(parsedContent) ? parsedContent : 
                             parsedContent.questions || parsedContent.data || [];
            const result = questions.map(q => ({
              question: q.question || q.text || q.content || '',
              difficulty: q.difficulty || difficulty,
              timeLimit: q.timeLimit || (difficulty === 'easy' ? 20 : difficulty === 'medium' ? 60 : 120)
            })).filter(q => q.question);
            
            if (result.length > 0) {
              console.log(`Successfully generated ${result.length} questions with model: ${model}`);
              return result;
            }
          } catch (e) {
            console.warn(`Failed to parse JSON response from ${model}, trying plain text extraction`);
            console.log(`Full response content from ${model}:`, content);
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
            
            if (questions.length > 0) {
              console.log(`Successfully extracted ${questions.length} questions from plain text with model: ${model}`);
              return questions;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to generate questions with model ${model}:`, error.message);
        if (error.response) {
          console.error(`Error response for ${model}:`, error.response.status, error.response.data);
        }
        // Continue to the next model
        continue;
      }
    }
    
    // If all models fail, return empty array
    console.error('Failed to generate questions with all available models');
    return [];
  }

  static async evaluateAnswer(question, answer, position) {
    if (!await this.checkApiKey()) {
      console.warn('Perplexity API key not available, returning default evaluation');
      return { score: 50, feedback: "Using default evaluation due to missing API key." };
    }

    // List of available models (in order of preference)
    const models = [
      "pplx-7b-online",
      "pplx-70b-online"
    ];
    
    for (const model of models) {
      try {
        console.log(`Attempting to evaluate answer with model: ${model}`);
        
        // Add more detailed request logging
        const requestData = {
          model: model,
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
          temperature: 0.7,
          max_tokens: 500
        };
        
        console.log('Request data:', JSON.stringify(requestData, null, 2));
        
        const response = await perplexityAxios.post(
          'https://api.perplexity.ai/chat/completions',
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`Perplexity API response status for ${model}:`, response.status);
        console.log(`Perplexity API response headers for ${model}:`, response.headers);

        if (response.status === 200 && response.data && response.data.choices && response.data.choices.length > 0) {
          const content = response.data.choices[0].message.content;
          console.log(`Perplexity API response content length for ${model}:`, content.length);
          console.log(`Perplexity API response content preview for ${model}:`, content.substring(0, 200) + '...');
          
          try {
            // Clean up the content to ensure it's valid JSON
            let cleanedContent = content.trim();
            // Remove any markdown code block markers
            cleanedContent = cleanedContent.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
            const result = JSON.parse(cleanedContent);
            console.log(`Successfully evaluated answer with model: ${model}`);
            return {
              score: Math.max(0, Math.min(10, result.score || 5)),
              feedback: result.feedback || "No feedback provided."
            };
          } catch (e) {
            console.warn(`Failed to parse JSON response from ${model}, trying plain text extraction`);
            console.log(`Full response content from ${model}:`, content);
            // Try to extract score and feedback from plain text
            const scoreMatch = content.match(/score.*?(\d+)/i);
            const score = scoreMatch ? Math.max(0, Math.min(10, parseInt(scoreMatch[1]))) : 5;
            const feedbackMatch = content.match(/feedback[:\s]*([^.]+\.)/i);
            const feedback = feedbackMatch ? feedbackMatch[1] : "Default feedback based on score.";
            console.log(`Successfully extracted evaluation from plain text with model: ${model}`);
            return { score, feedback };
          }
        }
      } catch (error) {
        console.warn(`Failed to evaluate answer with model ${model}:`, error.message);
        if (error.response) {
          console.error(`Error response for ${model}:`, error.response.status, error.response.data);
        }
        // Continue to the next model
        continue;
      }
    }
    
    // If all models fail, return default evaluation
    console.error('Failed to evaluate answer with all available models');
    return { score: 5, feedback: "Error processing evaluation. Please try again." };
  }

  static async generateSummary(candidateData, position) {
    if (!await this.checkApiKey()) {
      console.warn('Perplexity API key not available, returning default summary');
      return "Using default summary due to missing API key.";
    }

    // List of available models (in order of preference)
    const models = [
      "pplx-7b-online",
      "pplx-70b-online"
    ];
    
    for (const model of models) {
      try {
        console.log(`Attempting to generate summary with model: ${model}`);
        
        // Format the candidate's answers for the prompt
        const answersText = candidateData.answers.map((a, i) => {
          const question = candidateData.questions[i] || { question: "Unknown question" };
          return `Question ${i+1}: ${question.question}
Answer: ${a.text || 'No answer provided'}
Score: ${a.score !== undefined ? a.score : 'N/A'}/10
Feedback: ${a.feedback || 'No feedback'}`;
        }).join('\n\n');
        
        // Add more detailed request logging
        const requestData = {
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer providing candidate evaluations. Provide a comprehensive summary."
            },
            {
              role: "user",
              content: `Generate a comprehensive summary evaluation for a ${position} candidate based on their interview performance.

Candidate: ${candidateData.name || 'Unknown candidate'}
Position: ${position}
Overall Score: ${candidateData.score !== undefined ? candidateData.score : 'N/A'}/100

Interview Questions and Answers:
${answersText}

Provide a detailed evaluation summary (200-300 words) covering technical skills, strengths, weaknesses, and hiring recommendation.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };
        
        console.log('Request data:', JSON.stringify(requestData, null, 2));
        
        const response = await perplexityAxios.post(
          'https://api.perplexity.ai/chat/completions',
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`Perplexity API response status for ${model}:`, response.status);
        console.log(`Perplexity API response headers for ${model}:`, response.headers);

        if (response.status === 200 && response.data && response.data.choices && response.data.choices.length > 0) {
          const content = response.data.choices[0].message.content;
          console.log(`Perplexity API response content length for ${model}:`, content.length);
          console.log(`Perplexity API response content preview for ${model}:`, content.substring(0, 200) + '...');
          
          console.log(`Successfully generated summary with model: ${model}`);
          return response.data.choices[0].message.content || "No summary generated.";
        }
      } catch (error) {
        console.warn(`Failed to generate summary with model ${model}:`, error.message);
        if (error.response) {
          console.error(`Error response for ${model}:`, error.response.status, error.response.data);
        }
        // Continue to the next model
        continue;
      }
    }
    
    // If all models fail, return default summary
    console.error('Failed to generate summary with all available models');
    return "Error generating candidate summary. Please try again.";
  }
}

export default PerplexityAPI;