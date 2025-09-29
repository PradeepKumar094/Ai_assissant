# Testing Guide for AI Interview Assistant

## Overview
This document provides a comprehensive testing guide to verify that all features of the AI Interview Assistant are working correctly.

## Test Cases

### 1. Interviewee Tab Functionality

#### 1.1 Resume Upload
- [ ] Navigate to the Interviewee tab
- [ ] Click "Click to Upload Resume" button
- [ ] Select a PDF or DOCX file
- [ ] Verify that the file is processed and fields are extracted
- [ ] Verify that the form is pre-filled with extracted data

#### 1.2 Missing Fields Collection
- [ ] Upload a resume with missing information (e.g., no phone number)
- [ ] Verify that the form requires filling of missing fields
- [ ] Verify that validation works correctly (email format, required fields)

#### 1.3 Interview Start
- [ ] Fill all required fields
- [ ] Click "Start Interview" button
- [ ] Verify that the interview chat interface appears
- [ ] Verify that the first question is displayed with a 20-second timer

#### 1.4 Interview Flow
- [ ] Answer the first question and submit
- [ ] Verify that the second question (Easy) appears with a 20-second timer
- [ ] Let the timer expire on the third question (Medium) without answering
- [ ] Verify that "No answer provided (time ran out)" is recorded
- [ ] Verify that the fourth question (Medium) appears with a 60-second timer
- [ ] Continue through questions 5 and 6 (Hard) with 120-second timers
- [ ] Verify that the final score and summary are displayed after question 6

#### 1.5 Pause/Resume Functionality
- [ ] During an interview, click the "Pause" button
- [ ] Verify that the timer stops
- [ ] Click the "Resume" button
- [ ] Verify that the timer continues from where it left off

### 2. Interviewer Tab Functionality

#### 2.1 Candidate List
- [ ] Navigate to the Interviewer tab
- [ ] Verify that all candidates are listed
- [ ] Verify that candidates are sorted by score (completed first, then by score)
- [ ] Verify that incomplete interviews are sorted by creation date

#### 2.2 Search and Filter
- [ ] Use the search box to search for a candidate by name
- [ ] Verify that the list is filtered correctly
- [ ] Use the search box to search for a candidate by email
- [ ] Verify that the list is filtered correctly
- [ ] Clear the search
- [ ] Verify that all candidates are displayed again

#### 2.3 Status Filtering
- [ ] Use the status filter dropdown
- [ ] Filter by "Completed"
- [ ] Verify that only completed interviews are shown
- [ ] Filter by "In Progress"
- [ ] Verify that only in-progress interviews are shown
- [ ] Filter by "Not Started"
- [ ] Verify that only not-started interviews are shown

#### 2.4 View Details
- [ ] Click "View Details" for a candidate
- [ ] Verify that the view switches to the Interviewee tab
- [ ] Verify that the candidate details are displayed
- [ ] Verify that the interview history is shown
- [ ] Click "Back to Dashboard"
- [ ] Verify that the view switches back to the Interviewer tab

#### 2.5 Restart Interview
- [ ] For a completed or in-progress candidate, click "Restart"
- [ ] Verify that the interview status is reset
- [ ] Click "View Details" for the same candidate
- [ ] Verify that the interview starts from the beginning

### 3. Data Persistence

#### 3.1 Page Refresh
- [ ] Start an interview and answer a few questions
- [ ] Refresh the page
- [ ] Verify that the interview state is restored
- [ ] Verify that the correct question and timer state are restored

#### 3.2 Close and Reopen
- [ ] Close the browser tab
- [ ] Reopen the application
- [ ] Verify that the interview state is restored
- [ ] Verify that the Welcome Back modal appears for unfinished interviews

#### 3.3 Welcome Back Modal
- [ ] With an unfinished interview, refresh the page
- [ ] Verify that the Welcome Back modal appears
- [ ] Click on an unfinished interview
- [ ] Verify that that interview is resumed
- [ ] Click "Start New Interview"
- [ ] Verify that the Welcome Back modal closes and a new interview can be started

### 4. Cross-Tab Functionality

#### 4.1 Tab Switching
- [ ] Start an interview in the Interviewee tab
- [ ] Switch to the Interviewer tab
- [ ] Verify that the Interviewer dashboard is displayed
- [ ] Switch back to the Interviewee tab
- [ ] Verify that the interview is still in progress

#### 4.2 Simultaneous Updates
- [ ] While in an interview, switch to the Interviewer tab
- [ ] Note the candidate's status
- [ ] Switch back to the Interviewee tab and complete the interview
- [ ] Switch to the Interviewer tab again
- [ ] Verify that the candidate's status and score are updated

## Expected Results

All test cases should pass with the following expected behaviors:

1. Resume upload and field extraction work for both PDF and DOCX files
2. Missing fields are properly collected before interview start
3. Interview flow follows the correct timing (20s, 20s, 60s, 60s, 120s, 120s)
4. Automatic submission works when time expires
5. Pause/Resume functionality works correctly
6. Candidate list is properly sorted and filtered
7. View Details and Restart functions work correctly
8. Data persists across page refreshes and browser sessions
9. Welcome Back modal appears for unfinished sessions
10. Tab switching works seamlessly between Interviewee and Interviewer views

## Troubleshooting

If any test cases fail, check the following:

1. Browser console for JavaScript errors
2. Network tab for failed API requests (if using external services)
3. Local storage for proper data persistence
4. Redux state in the Redux DevTools extension (if installed)
5. Component rendering and event handling in React DevTools (if installed)

## Conclusion

This testing guide ensures that all core functionality of the AI Interview Assistant works as expected. All features should be verified before considering the application ready for production use.