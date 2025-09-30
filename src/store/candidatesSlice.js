import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  candidates: [],
  currentCandidateId: null,
  activeTab: 'interviewee', // interviewee or interviewer
  viewMode: 'tabs', // 'tabs' or 'details'
};

export const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    addCandidate: (state, action) => {
      state.candidates.push(action.payload);
    },
    updateCandidate: (state, action) => {
      const index = state.candidates.findIndex((c) => c.id === action.payload.id);
      if (index === -1) return;
      const current = state.candidates[index];
      const incoming = action.payload;
      // Merge only provided fields, preserving existing ones unless explicitly set
      state.candidates[index] = {
        ...current,
        ...incoming,
        // Properly merge arrays - use incoming values if provided, otherwise keep current
        answers: incoming.answers !== undefined ? incoming.answers : current.answers,
        questions: incoming.questions !== undefined ? incoming.questions : current.questions,
        // Preserve other properties that might not be in the incoming update
        currentQuestionIndex: incoming.currentQuestionIndex !== undefined ? incoming.currentQuestionIndex : current.currentQuestionIndex,
        timeLeft: incoming.timeLeft !== undefined ? incoming.timeLeft : current.timeLeft,
        isPaused: incoming.isPaused !== undefined ? incoming.isPaused : current.isPaused,
        interviewStatus: incoming.interviewStatus !== undefined ? incoming.interviewStatus : current.interviewStatus,
        score: incoming.score !== undefined ? incoming.score : current.score,
        summary: incoming.summary !== undefined ? incoming.summary : current.summary,
      };
    },
    setCurrentCandidateId: (state, action) => {
      state.currentCandidateId = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload; // 'tabs' | 'details'
    },
    resetInterview: (state, action) => {
      const candidateId = action.payload;
      const candidate = state.candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.interviewStatus = 'not_started';
        candidate.answers = [];
        candidate.questions = [];
        candidate.score = null;
        candidate.summary = '';
        candidate.timeLeft = null;
        candidate.isPaused = false;
        candidate.currentQuestionIndex = 0;
      }
    }
  },
});

export const { 
  addCandidate, 
  updateCandidate, 
  setCurrentCandidateId, 
  setActiveTab,
  setViewMode,
  resetInterview
} = candidatesSlice.actions;

export default candidatesSlice.reducer;