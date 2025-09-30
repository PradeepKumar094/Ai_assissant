import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCandidate } from '../store/candidatesSlice';
import { Card, Button, Typography, Progress, Input, Spin, Alert, Row, Col, Tag, Space, Divider } from 'antd';
import { SendOutlined, PauseOutlined, PlayCircleOutlined, HourglassOutlined, CheckCircleOutlined, ClockCircleOutlined, ApiOutlined } from '@ant-design/icons';
import { PerplexityAPI } from '../utils/perplexityAPI';
import { defaultQuestions } from '../utils/defaultQuestions';

const { Title, Text } = Typography;
const { TextArea } = Input;

const InterviewChat = () => {
  const dispatch = useDispatch();
  const { candidates, currentCandidateId } = useSelector(state => state.candidates);
  
  // Use useMemo to prevent unnecessary re-renders
  const activeCandidate = useMemo(() => {
    return candidates.find(c => c.id === currentCandidateId);
  }, [candidates, currentCandidateId]);
  
  // Use candidate's currentQuestionIndex instead of local state
  const currentQuestionIndex = activeCandidate?.currentQuestionIndex || 0;
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showApiInfo, setShowApiInfo] = useState(false);
  
  const timerRef = useRef(null);
  const hasGeneratedQuestions = useRef(false);
  const hasFinishedInterview = useRef(false);
  const generationTimeoutRef = useRef(null);
  
  // Determine time limit based on question difficulty
  const getTimeLimit = (index) => {
    if (index < 2) return 20; // Easy questions: 20 seconds
    if (index < 4) return 60; // Medium questions: 60 seconds
    return 120; // Hard questions: 120 seconds
  };
  
  // Get difficulty based on question index
  const getDifficulty = (index) => {
    if (index < 2) return 'Easy';
    if (index < 4) return 'Medium';
    return 'Hard';
  };
  
  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'success';
      case 'Medium': return 'warning';
      case 'Hard': return 'error';
      default: return 'default';
    }
  };
  
  // Generate all questions in one API call
  const generateQuestionsBatch = useCallback(async () => {
    try {
      // Debug log to check API key
      console.log('Perplexity API Key Available:', PerplexityAPI.isApiKeyAvailable());
      console.log('Raw API key value:', PerplexityAPI.apiKey);
      
      // Extract role information from resume if available
      const roleInfo = activeCandidate?.resumeData?.skills?.join(', ') || 'Full Stack Developer (React/Node.js)';
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Question generation timeout after 30 seconds')), 30000);
      });
      
      // Try to generate questions with Perplexity API
      console.log('Attempting to generate questions with Perplexity API...');
      let allQuestions = [];
      
      try {
        // Generate 2 easy, 2 medium, and 2 hard questions with timeout
        console.log('Generating easy questions...');
        const easyQuestions = await Promise.race([
          PerplexityAPI.generateQuestions(roleInfo, 'easy', 2),
          timeoutPromise
        ]);
        console.log('Easy questions generated:', easyQuestions.length);
        
        console.log('Generating medium questions...');
        const mediumQuestions = await Promise.race([
          PerplexityAPI.generateQuestions(roleInfo, 'medium', 2),
          timeoutPromise
        ]);
        console.log('Medium questions generated:', mediumQuestions.length);
        
        console.log('Generating hard questions...');
        const hardQuestions = await Promise.race([
          PerplexityAPI.generateQuestions(roleInfo, 'hard', 2),
          timeoutPromise
        ]);
        console.log('Hard questions generated:', hardQuestions.length);
        
        // Combine all questions
        allQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
        console.log('Total questions generated:', allQuestions.length);
      } catch (apiError) {
        console.error('Error generating questions with Perplexity API:', apiError);
      }
      
      // If we still don't have questions, use defaults
      if (allQuestions.length === 0) {
        console.log('No questions generated from API, using default questions');
        return defaultQuestions.map((q, idx) => ({ 
          id: `default-${Date.now()}-${idx}`, 
          question: q.question, 
          difficulty: q.difficulty, 
          timeLimit: q.timeLimit || getTimeLimit(idx) 
        }));
      }
      
      return allQuestions.map((q, idx) => ({
        id: `generated-${Date.now()}-${idx}`,
        question: q.question,
        difficulty: q.difficulty || getDifficulty(idx),
        timeLimit: q.timeLimit || getTimeLimit(idx)
      }));
    } catch (err) {
      console.error('Error in generateQuestionsBatch:', err);
      // Always return default questions as fallback
      console.log('Returning default questions due to error');
      return defaultQuestions.map((q, idx) => ({ 
        id: `fallback-${Date.now()}-${idx}`, 
        question: q.question,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit || getTimeLimit(idx) 
      }));
    }
  }, [activeCandidate]);
  
  const submitAnswer = useCallback(async () => {
    if (currentQuestionIndex >= 6) return;
    
    if (!activeCandidate || !activeCandidate.questions || activeCandidate.questions.length === 0) return;
    
    const currentQuestion = activeCandidate.questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    const answerToSubmit = answer || "No answer provided (time ran out)";
    
    // Extract role information from resume if available
    const roleInfo = activeCandidate.resumeData?.skills?.join(', ') || 'Full Stack Developer (React/Node.js)';
    
    // Evaluate answer using Perplexity API
    setLoading(true);
    try {
      console.log('Evaluating answer with Perplexity API...');
      console.log('Question:', currentQuestion.question);
      console.log('Answer:', answerToSubmit);
      console.log('Role:', roleInfo);
      
      let evaluation = { score: 5, feedback: "Default evaluation due to API error." };
      
      try {
        evaluation = await PerplexityAPI.evaluateAnswer(
          currentQuestion.question,
          answerToSubmit,
          roleInfo
        );
        console.log('Evaluation result:', evaluation);
      } catch (apiError) {
        console.error('Error evaluating answer with Perplexity API, using default evaluation:', apiError);
      }
      
      const updatedAnswers = [
        ...activeCandidate.answers,
        {
          questionId: currentQuestion.id,
          text: answerToSubmit,
          score: evaluation.score,
          feedback: evaluation.feedback,
          timestamp: new Date().toISOString()
        }
      ];
      
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = activeCandidate.questions[nextIndex];
      const nextTimeLeft = nextQuestion ? nextQuestion.timeLimit : 0;
      const updatedCandidate = {
        ...activeCandidate,
        answers: updatedAnswers,
        currentQuestionIndex: nextIndex,
        timeLeft: nextTimeLeft,
        isPaused: false
      };
      
      dispatch(updateCandidate(updatedCandidate));
      setAnswer('');
    } catch (err) {
      console.error('Error in submitAnswer:', err);
      setNotice(err?.message || 'Error submitting answer. Please try again.');
      
      // Fallback without evaluation
      const updatedAnswers = [
        ...activeCandidate.answers,
        {
          questionId: currentQuestion.id,
          text: answerToSubmit,
          timestamp: new Date().toISOString()
        }
      ];
      
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = activeCandidate.questions[nextIndex];
      const nextTimeLeft = nextQuestion ? nextQuestion.timeLimit : 0;
      const updatedCandidate = {
        ...activeCandidate,
        answers: updatedAnswers,
        currentQuestionIndex: nextIndex,
        timeLeft: nextTimeLeft,
        isPaused: false
      };
      
      dispatch(updateCandidate(updatedCandidate));
      setAnswer('');
    } finally {
      setLoading(false);
    }
  }, [activeCandidate, answer, dispatch]);
  
  const finishInterview = useCallback(async () => {
    if (!activeCandidate) return;
    
    setLoading(true);
    
    try {
      // Calculate final score as average of all question scores
      let totalScore = 0;
      let answeredQuestions = 0;
      
      activeCandidate.answers.forEach(answer => {
        if (answer.score !== undefined && answer.score !== null) {
          totalScore += answer.score;
          answeredQuestions++;
        }
      });
      
      // Compute out of 100. Unanswered count as 0
      const perQuestionScores = activeCandidate.answers.map(a => a.score || 0);
      const totalOutOfTen = perQuestionScores.reduce((s, n) => s + n, 0);
      const averageOutOfTen = totalOutOfTen / 6; // 6 questions
      const averageScore = Math.max(0, Math.min(100, Math.round(averageOutOfTen * 10)));
      
      // Generate summary using Perplexity API
      const roleInfo = activeCandidate.resumeData?.skills?.join(', ') || 'Full Stack Developer (React/Node.js)';
      
      console.log('Generating summary with Perplexity API...');
      console.log('Candidate data:', activeCandidate);
      console.log('Role:', roleInfo);
      
      let summary = "Default summary due to API error.";
      
      try {
        summary = await PerplexityAPI.generateSummary(
          activeCandidate,
          roleInfo
        );
        console.log('Summary generated:', summary);
      } catch (apiError) {
        console.error('Error generating summary with Perplexity API, using default summary:', apiError);
      }
      
      const updatedCandidate = {
        ...activeCandidate,
        interviewStatus: 'completed',
        score: averageScore,
        summary: summary,
        completedAt: new Date().toISOString()
      };
      
      dispatch(updateCandidate(updatedCandidate));
    } catch (err) {
      console.error('Failed to generate final score and summary:', err);
      setError('Failed to generate final score and summary. Please try again.');
      
      // Do not fabricate scores; complete with computed score and empty summary
      const updatedCandidate = {
        ...activeCandidate,
        interviewStatus: 'completed',
        score: Math.max(0, Math.min(100, Math.round(((activeCandidate.answers.reduce((s, a) => s + (a.score || 0), 0)) / 6) * 10))),
        summary: activeCandidate.summary || '',
        completedAt: new Date().toISOString()
      };
      dispatch(updateCandidate(updatedCandidate));
    } finally {
      setLoading(false);
    }
  }, [activeCandidate, dispatch]);
  
  const togglePause = () => {
    setIsPaused(!isPaused);
  };
  
  // Initialize or continue the interview
  useEffect(() => {
    // Clear any existing timeouts
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }
    
    if (!activeCandidate) {
      setLoading(false);
      return;
    }
    
    // Test API connection on first load
    if (!hasGeneratedQuestions.current && activeCandidate.interviewStatus === 'not_started') {
      console.log('Testing Perplexity API connection...');
      console.log('Active candidate:', activeCandidate);
      console.log('API key available:', PerplexityAPI.isApiKeyAvailable());
      
      PerplexityAPI.testConnection().then(result => {
        console.log('API Test Result:', result);
        if (!result.success) {
          console.warn('Perplexity API connection test failed:', result.error);
          setError('Perplexity API connection test failed. Using default questions.');
        }
      });
    }
    
    if (activeCandidate.interviewStatus === 'completed') return;
    
    if (currentQuestionIndex < 6) {
      if (!activeCandidate.questions || activeCandidate.questions.length === 0) {
        // Only generate questions once at a time
        if (!hasGeneratedQuestions.current) {
          hasGeneratedQuestions.current = true;
          
          // Set a timeout to prevent infinite loading
          generationTimeoutRef.current = setTimeout(() => {
            if (loading === true) {
              hasGeneratedQuestions.current = false;
              setLoading(false);
              setError('Question generation timed out. Please refresh the page and try again.');
            }
          }, 35000); // 35 seconds timeout
          
          setLoading(true);
          generateQuestionsBatch()
            .then(batch => {
              // Clear the timeout since we succeeded
              if (generationTimeoutRef.current) {
                clearTimeout(generationTimeoutRef.current);
                generationTimeoutRef.current = null;
              }
              
              // Reset the flag after successful generation
              hasGeneratedQuestions.current = false;
              
              // If we still don't have questions, show an error
              if (batch.length === 0) {
                setError('Failed to generate questions. Please refresh the page and try again.');
                setLoading(false);
                return;
              }
              
              const updatedCandidate = {
                ...activeCandidate,
                questions: batch,
                interviewStatus: 'in_progress',
                currentQuestionIndex: 0,
                timeLeft: batch[0].timeLimit,
                isPaused: false
              };
              dispatch(updateCandidate(updatedCandidate));
              setLoading(false);
            })
            .catch((error) => {
              // Clear the timeout since we failed
              if (generationTimeoutRef.current) {
                clearTimeout(generationTimeoutRef.current);
                generationTimeoutRef.current = null;
              }
              
              // Reset the flag on error so we can retry
              hasGeneratedQuestions.current = false;
              setError('Failed to generate questions. Please refresh the page and try again.');
              setLoading(false);
            });
        }
      } else {
        // Guard against out-of-range index
        if (currentQuestionIndex >= activeCandidate.questions.length) {
          const safeIndex = Math.max(0, activeCandidate.questions.length - 1);
          const q = activeCandidate.questions[safeIndex];
          const newTimeLeft = activeCandidate.timeLeft || q.timeLimit;
          
          // Update candidate if needed
          if (activeCandidate.currentQuestionIndex !== safeIndex || activeCandidate.timeLeft !== newTimeLeft) {
            const updatedCandidate = {
              ...activeCandidate,
              currentQuestionIndex: safeIndex,
              timeLeft: newTimeLeft
            };
            dispatch(updateCandidate(updatedCandidate));
          }
          setTimeLeft(newTimeLeft);
          return;
        }
        const currentQuestion = activeCandidate.questions[currentQuestionIndex];
        const newTimeLeft = activeCandidate.timeLeft || currentQuestion.timeLimit;
        // Only update timeLeft if it's different to avoid unnecessary re-renders
        if (timeLeft !== newTimeLeft) {
          setTimeLeft(newTimeLeft);
        }
        setLoading(false);
      }
    } else if (currentQuestionIndex >= 6 && activeCandidate.questions && activeCandidate.questions.length > 0 && !activeCandidate.score) {
      // Interview completed - generate score and summary
      // Only finish interview once
      if (!hasFinishedInterview.current) {
        hasFinishedInterview.current = true;
        finishInterview()
          .then(() => {
            // Reset the flag after successful completion
            hasFinishedInterview.current = false;
          })
          .catch((error) => {
            // Reset the flag on error so we can retry
            hasFinishedInterview.current = false;
          });
      }
    } else {
      // We have questions and possibly a score, so we're not loading
      setLoading(false);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (generationTimeoutRef.current) clearTimeout(generationTimeoutRef.current);
    };
  }, [activeCandidate, dispatch, generateQuestionsBatch, finishInterview]);
  
  // Timer effect - restart on question index change, pause change, or new timeLeft
  useEffect(() => {
    if (!activeCandidate) return;
    
    // Sync timeLeft with Redux store
    if (activeCandidate.timeLeft !== undefined && activeCandidate.timeLeft !== timeLeft) {
      setTimeLeft(activeCandidate.timeLeft);
    }
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Don't start timer if paused or already at 0
    if (isPaused || timeLeft <= 0 || activeCandidate.interviewStatus === 'completed') return;
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Force submit answer when time runs out
          submitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, timeLeft, currentQuestionIndex, activeCandidate?.interviewStatus, activeCandidate?.timeLeft, submitAnswer]);

  // Reset flags when candidate changes
  useEffect(() => {
    hasGeneratedQuestions.current = false;
    hasFinishedInterview.current = false;
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
  }, [currentCandidateId]);

  const currentQuestion = activeCandidate && activeCandidate.questions ? activeCandidate.questions[currentQuestionIndex] : null;
  
  if (activeCandidate && activeCandidate.interviewStatus === 'completed') {
    return (
      <div className="fade-in" style={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%',
        padding: '2rem'
      }}>
        <Row justify="center" align="middle" style={{ 
          flex: 1,
          minHeight: '70vh'
        }}>
          <Col span={24} style={{ textAlign: 'center' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <CheckCircleOutlined style={{ fontSize: '4rem', color: 'white' }} />
            </div>
            <Title level={2} style={{ marginTop: '1rem' }}>
              Interview Completed
            </Title>
            <Text style={{ fontSize: '1.2rem' }}>
              Congratulations, {activeCandidate.name}!
            </Text>
            <br />
            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              margin: '2rem auto',
              maxWidth: '400px'
            }}>
              <Text style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: 'white'
              }}>
                Final Score: {activeCandidate.score}/100
              </Text>
            </div>
            
            {showApiInfo && (
              <Alert
                message={
                  <span>
                    <ApiOutlined /> AI Integration Information
                  </span>
                }
                description={
                  <span>
                    This demo is using mock AI responses. To enable real Perplexity AI integration, 
                    please add your Perplexity API key to the .env file.
                  </span>
                }
                type="info"
                showIcon
                style={{ 
                  marginBottom: '1.5rem',
                  maxWidth: '600px',
                  margin: '0 auto 1.5rem'
                }}
              />
            )}
            
            <Card style={{ 
              marginTop: '2rem', 
              textAlign: 'left', 
              maxWidth: '600px', 
              margin: '2rem auto 0',
              width: '100%',
              border: '1px solid #e2e8f0'
            }}>
              <Title level={4}>
                <CheckCircleOutlined style={{ marginRight: '0.5rem' }} />
                AI Summary
              </Title>
              <div style={{ 
                background: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <Text>{activeCandidate.summary}</Text>
              </div>
            </Card>
            
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.location.reload()}
              style={{ marginTop: '2rem' }}
            >
              Start New Interview
            </Button>
          </Col>
        </Row>
      </div>
    );
  }
  
  if (loading && currentQuestionIndex < 6) {
    return (
      <div className="fade-in" style={{ 
        textAlign: 'center', 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%'
      }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1
        }}>
          <Spin size="large" />
          <Text style={{ 
            display: 'block', 
            marginTop: '1rem', 
            fontSize: '1.2rem' 
          }}>
            Preparing your questions...
          </Text>
        </div>
      </div>
    );
  }
  
  if (loading && currentQuestionIndex >= 6) {
    return (
      <div className="fade-in" style={{ 
        textAlign: 'center', 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%'
      }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1
        }}>
          <Spin size="large" />
          <Text style={{ 
            display: 'block', 
            marginTop: '1rem', 
            fontSize: '1.2rem' 
          }}>
            Generating your final score and summary...
          </Text>
        </div>
      </div>
    );
  }
  
  // Show a message if there's no active candidate
  if (!activeCandidate) {
    return (
      <div className="fade-in" style={{ 
        textAlign: 'center', 
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%'
      }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1
        }}>
          <Text style={{ 
            display: 'block', 
            fontSize: '1.2rem' 
          }}>
            No candidate selected. Please start a new interview.
          </Text>
          <Button 
            type="primary" 
            size="large"
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem' }}
          >
            Start New Interview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ 
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      width: '100%',
      height: '100%',
      padding: '2rem'
    }}>
      {showApiInfo && (
        <Alert 
          message="Perplexity API key required" 
          description="Please add VITE_PERPLEXITY_API_KEY in a .env file and restart the app to enable real question generation and evaluation."
          type="warning" 
          showIcon 
          style={{ marginBottom: '1.5rem' }}
        />
      )}
      {error && (
        <Alert 
          message="Error" 
          description={error} 
          type="error" 
          showIcon 
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '1.5rem' }}
        />
      )}
      {notice && (
        <Alert 
          message="Notice" 
          description={notice} 
          type="info" 
          showIcon 
          closable
          onClose={() => setNotice(null)}
          style={{ marginBottom: '1.5rem' }}
        />
      )}
      
      <Card style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Title level={3} style={{ margin: 0 }}>
                <HourglassOutlined style={{ marginRight: '0.5rem' }} />
                Interview in Progress
              </Title>
              <Text>Candidate: {activeCandidate.name}</Text>
            </Col>
            <Col>
              <Space>
                <Tag icon={<ClockCircleOutlined />} color="processing">
                  Question {currentQuestionIndex + 1}/6
                </Tag>
                <Button 
                  icon={isPaused ? <PlayCircleOutlined /> : <PauseOutlined />} 
                  onClick={togglePause}
                  size="large"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
              </Space>
            </Col>
          </Row>
          
          <div style={{ marginTop: '1rem' }}>
            <Progress 
              percent={Math.round(((currentQuestionIndex) / 6) * 100)} 
              status="active" 
              style={{ margin: '0.5rem 0' }}
            />
          </div>
        </div>
        
        {currentQuestion && (
          <Card 
            title={
              <span>
                Question <Tag color={getDifficultyColor(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Tag>
              </span>
            } 
            style={{ 
              marginBottom: '1.5rem', 
              marginTop: '1rem',
              flex: 1
            }}
          >
            <Text style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              {currentQuestion.question}
            </Text>
            
            <Divider />
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '1rem',
              backgroundColor: timeLeft < 10 ? '#fee2e2' : timeLeft < 30 ? '#fef3c7' : '#f8fafc',
              borderRadius: '8px',
              border: timeLeft < 10 ? '2px solid #ef4444' : timeLeft < 30 ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              transition: 'all 0.3s ease'
            }}>
              <Text strong>Time remaining: </Text>
              <Text 
                strong 
                type={timeLeft < 10 ? 'danger' : timeLeft < 30 ? 'warning' : 'success'}
                style={{ 
                  fontSize: timeLeft < 10 ? '1.5rem' : '1.2rem', 
                  marginLeft: '0.5rem',
                  animation: timeLeft < 10 ? 'pulse 1s infinite' : 'none'
                }}
              >
                {timeLeft}s
              </Text>
              <Progress 
                percent={Math.round(((currentQuestion.timeLimit - timeLeft) / currentQuestion.timeLimit) * 100)} 
                style={{ width: '200px', marginLeft: '1rem' }}
                status={timeLeft < 10 ? 'exception' : timeLeft < 30 ? 'normal' : 'success'}
                strokeColor={{
                  '0%': timeLeft < 10 ? '#ef4444' : timeLeft < 30 ? '#f59e0b' : '#10b981',
                  '100%': timeLeft < 10 ? '#b91c1c' : timeLeft < 30 ? '#d97706' : '#059669'
                }}
              />
              {timeLeft < 10 && (
                <div style={{ 
                  marginLeft: '1rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  animation: 'blink 0.5s infinite'
                }}>
                  Hurry Up!
                </div>
              )}
            </div>
          </Card>
        )}
        
        <div style={{ 
          marginTop: '1.5rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Text strong>Your Answer:</Text>
          <TextArea
            rows={6}
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isPaused}
            style={{ 
              marginTop: '0.5rem',
              flex: 1
            }}
          />
        </div>
        
        <div style={{ 
          marginTop: '1.5rem', 
          textAlign: 'right' 
        }}>
          <Button 
            type="primary" 
            icon={<SendOutlined />}
            onClick={submitAnswer}
            disabled={isPaused}
            size="large"
          >
            Submit Answer
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default InterviewChat;