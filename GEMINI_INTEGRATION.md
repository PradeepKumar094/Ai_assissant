# Gemini API Integration Guide

This document explains how to integrate the AI Interview Assistant with Google's Gemini API for enhanced question generation, answer evaluation, and candidate assessment.

## Prerequisites

1. A Google Cloud Project
2. Gemini API enabled in your project
3. An API key for authentication

## Setup Instructions

### 1. Obtain API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Generative Language API
4. Navigate to "APIs & Services" > "Credentials"
5. Create an API key
6. Restrict the API key to the Generative Language API for security

### 2. Configure Environment Variables

Create a `.env` file in the root of your project:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Update the Gemini API Utility

Replace the mock implementation in `src/utils/geminiAPI.js` with the actual API calls:

```javascript
// src/utils/geminiAPI.js

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

class GeminiAPI {
  // Generate interview questions
  static async generateQuestion(candidateProfile, questionNumber, difficulty) {
    const prompt = `Generate a ${difficulty} difficulty interview question for a ${candidateProfile.role} position. 
                   This is question number ${questionNumber} in the interview. 
                   Focus on ${difficulty === 'Easy' ? 'fundamentals' : difficulty === 'Medium' ? 'practical application' : 'advanced concepts'}.
                   Return only the question text without any additional formatting.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  // Evaluate candidate answers
  static async evaluateAnswer(question, answer, difficulty) {
    const prompt = `Evaluate the following answer to the interview question: "${question}"
                   Answer: "${answer}"
                   Difficulty: ${difficulty}
                   Please provide a score from 1-10 and a brief explanation of your evaluation.
                   Format your response as JSON with "score" and "feedback" fields.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Try to parse as JSON, fallback to text parsing if needed
    try {
      const jsonData = JSON.parse(responseText);
      return {
        score: jsonData.score,
        feedback: jsonData.feedback
      };
    } catch (e) {
      // Fallback parsing for non-JSON responses
      const scoreMatch = responseText.match(/score.*?(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
      
      return {
        score: Math.min(10, Math.max(1, score)),
        feedback: responseText
      };
    }
  }

  // Generate final interview summary
  static async generateSummary(candidateProfile, answers) {
    const prompt = `Based on the following interview answers from a candidate for a ${candidateProfile.role} position, 
                   provide a comprehensive summary of their performance including strengths, areas for improvement, 
                   and a final recommendation.
                   
                   Answers: ${JSON.stringify(answers, null, 2)}
                   
                   Structure your response with clear sections for Strengths, Areas for Improvement, and Overall Recommendation.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}

export default GeminiAPI;
```

## Rate Limits and Quotas

The Gemini API has usage limits:
- Free tier: 60 requests per minute
- Paid plans available for higher limits

Implement rate limiting in your application to avoid hitting these limits:

```javascript
// Simple rate limiting implementation
const rateLimiter = {
  lastRequestTime: 0,
  minInterval: 1000, // 1 second between requests
  
  async execute(apiCall) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
    return apiCall();
  }
};

// Usage in components:
// await rateLimiter.execute(() => GeminiAPI.generateQuestion(...))
```

## Error Handling

Implement comprehensive error handling for API failures:

```javascript
try {
  const question = await GeminiAPI.generateQuestion(profile, questionNumber, difficulty);
  // Use the question
} catch (error) {
  console.error('Failed to generate question:', error);
  // Fallback to default questions
  const fallbackQuestion = getDefaultQuestion(difficulty, questionNumber);
}
```

## Cost Considerations

Monitor your API usage to manage costs:
- Each API call consumes tokens
- Complex prompts and responses consume more tokens
- Enable billing alerts in Google Cloud Console

## Security Best Practices

1. Never expose your API key in client-side code in production
2. Use environment variables for API keys
3. Restrict API key usage to specific APIs
4. Rotate API keys regularly
5. Monitor API usage for unusual activity

## Testing

Test the integration thoroughly:
1. Verify question generation quality
2. Test answer evaluation accuracy
3. Validate summary generation usefulness
4. Check error handling for network failures
5. Test rate limiting behavior

## Troubleshooting

Common issues and solutions:

1. **400 Bad Request**: Check API key and request format
2. **403 Forbidden**: Verify API key restrictions
3. **429 Too Many Requests**: Implement rate limiting
4. **500 Internal Server Error**: Retry with exponential backoff

## Support

For issues with the Gemini API:
1. Check the [Gemini API documentation](https://ai.google.dev/docs)
2. Review the [troubleshooting guide](https://ai.google.dev/faq)
3. Visit the [Google AI Discord](https://discord.gg/googleai) for community support