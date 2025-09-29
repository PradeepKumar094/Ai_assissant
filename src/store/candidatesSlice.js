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
        answers: incoming.answers ? incoming.answers : current.answers,
        questions: incoming.questions ? incoming.questions : current.questions,
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