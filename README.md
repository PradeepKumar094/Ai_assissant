# AI-Powered Interview Assistant (Crisp)

This is a React application that works as an AI-powered interview assistant with the following features:

## Features

1. **Two Tabs Interface**:
   - Interviewee (chat)
   - Interviewer (dashboard)
   - Both tabs stay synced

2. **Interviewee Tab**:
   - Resume upload (PDF required, DOCX optional)
   - Extraction of Name, Email, Phone from resume
   - Collection of missing fields before starting interview
   - Timed interview with AI-generated questions and answer evaluation

3. **Interviewer Tab**:
   - List of candidates ordered by score
   - Ability to view each candidate's chat history, profile, and final AI summary
   - Search and sort functionality

4. **Persistence**:
   - All data is persisted locally
   - Progress is restored when closing/reopening the app
   - Welcome Back modal for unfinished sessions

## Interview Flow

- AI dynamically generates questions for full stack (React/Node) role one by one
- 6 questions total: 2 Easy → 2 Medium → 2 Hard
- Questions are shown one by one in the chat
- Timers per question: Easy (20s), Medium (60s), Hard (120s)
- When time runs out, the system automatically submits the answer and moves on
- After the 6th question, the AI calculates a final score and creates a short summary

## Tech Stack

- React + Vite
- Redux Toolkit with Redux Persist for state management and persistence
- Ant Design for UI components
- PDF parsing for resume extraction

## Setup Instructions

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Open `http://localhost:5173` in your browser

## Perplexity API Integration

The application now includes integration with Perplexity Pro for enhanced AI capabilities:

1. **Get your Perplexity API key**:
   - Go to [Perplexity AI](https://www.perplexity.ai/)
   - Sign up for a Pro account
   - Navigate to API section
   - Create a new API key

2. **Configure the API key**:
   - Open the `.env` file in the project root
   - Replace `your_perplexity_api_key_here` with your actual API key:
   ```
   VITE_PERPLEXITY_API_KEY=your_actual_api_key_here
   ```

3. **Restart the development server**:
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again

With a valid API key, the application will use real AI capabilities for:
- Dynamic question generation based on role and difficulty
- Intelligent answer evaluation and scoring
- Detailed candidate feedback and improvement suggestions
- Final interview summary generation

## Gemini API Integration (Alternative)

If you prefer to use Google's Gemini API instead:

1. **Get your Gemini API key**:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create an account or sign in
   - Navigate to API Keys section
   - Create a new API key

2. **Configure the API key**:
   - Open the `.env` file in the project root
   - Replace `your_gemini_api_key_here` with your actual API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Restart the development server**:
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again

## Folder Structure

```
src/
├── components/
│   ├── IntervieweeTab.jsx
│   ├── InterviewerTab.jsx
│   ├── InterviewChat.jsx
│   └── CandidateDetailView.jsx
├── store/
│   ├── store.js
│   └── candidatesSlice.js
├── utils/
│   ├── resumeParser.js
│   ├── perplexityAPI.js
│   └── geminiAPI.js
├── App.jsx
├── App.css
├── main.jsx
└── index.css
```

## How to Use

### For Candidates (Interviewee Tab)
1. Upload your resume (PDF or DOCX)
2. Fill in any missing information (name, email, phone)
3. Start the interview
4. Answer questions within the time limit
5. View your final score and AI summary

### For Interviewers (Interviewer Tab)
1. View all candidates and their scores
2. Search and sort candidates
3. Click "View Details" to see candidate's interview history
4. Restart interviews if needed

## Future Improvements

- Enhanced resume parsing with proper PDF/DOCX libraries
- User authentication and role-based access control
- Email notifications
- Video recording capabilities
- More detailed analytics and reporting

## License

This project is licensed under the MIT License.