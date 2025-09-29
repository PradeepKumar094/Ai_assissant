import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCandidate } from '../store/candidatesSlice';
import { Card, Button, Typography, Progress, Input, Spin, Alert, Row, Col, Tag, Space, Divider } from 'antd';
import { SendOutlined, PauseOutlined, PlayCircleOutlined, HourglassOutlined, CheckCircleOutlined, ClockCircleOutlined, ApiOutlined } from '@ant-design/icons';
import GeminiAPI from '../utils/geminiAPI';

const { Title, Text } = Typography;
const { TextArea } = Input;

const InterviewChat = ({ candidate }) => {
  const dispatch = useDispatch();
  const candidates = useSelector(state => state.candidates.candidates);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(candidate.currentQuestionIndex || candidate.questions.length);
  const [timeLeft, setTimeLeft] = useState(candidate.timeLeft || 0);
  const [answer, setAnswer] = useState('');
  const [isPaused, setIsPaused] = useState(!!candidate.isPaused);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showApiInfo, setShowApiInfo] = useState(!GeminiAPI.isApiKeyAvailable());
  
  const timerRef = useRef(null);
  
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
  
  // Resolve latest candidate from store to avoid stale props
  const activeCandidate = candidates.find(c => c.id === candidate.id) || candidate;

  // Generate all questions in one API call
  const generateQuestionsBatch = async () => {
    try {
      const list = await GeminiAPI.generateQuestionsBatch({ role: 'Full Stack Developer (React/Node.js)' });
      return list;
    } catch (err) {
      setError('Failed to generate questions batch. Using default set.');
      console.error('Error generating batch questions:', err);
      const defaults = [
        { text: "What is React and what are its main features?", difficulty: 'Easy' },
        { text: "Explain the difference between state and props in React.", difficulty: 'Easy' },
        { text: "How does React's virtual DOM work and why is it important?", difficulty: 'Medium' },
        { text: "Explain middleware in Express.js and give an example of how to use it.", difficulty: 'Medium' },
        { text: "How would you optimize the performance of a React application?", difficulty: 'Hard' },
        { text: "Describe how you would design a RESTful API for a social media platform using Node.js.", difficulty: 'Hard' }
      ];
      return defaults.map((q, idx) => ({ id: Date.now() + idx, text: q.text, difficulty: q.difficulty, timeLimit: getTimeLimit(idx) }));
    }
  };
  
  // Initialize or continue the interview
  useEffect(() => {
    if (activeCandidate.interviewStatus === 'completed') return;
    
    if (currentQuestionIndex < 6) {
      if (activeCandidate.questions.length === 0) {
        setLoading(true);
        generateQuestionsBatch()
          .then(batch => {
            const updatedCandidate = {
              ...activeCandidate,
              questions: batch,
              interviewStatus: 'in_progress',
              currentQuestionIndex: 0,
              timeLeft: batch[0].timeLimit,
              isPaused: false
            };
            dispatch(updateCandidate(updatedCandidate));
            setCurrentQuestionIndex(0);
            setTimeLeft(batch[0].timeLimit);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        // Guard against out-of-range index
        if (currentQuestionIndex >= activeCandidate.questions.length) {
          const safeIndex = Math.max(0, activeCandidate.questions.length - 1);
          setCurrentQuestionIndex(safeIndex);
          const q = activeCandidate.questions[safeIndex];
          setTimeLeft(activeCandidate.timeLeft || q.timeLimit);
          return;
        }
        const currentQuestion = activeCandidate.questions[currentQuestionIndex];
        setTimeLeft(activeCandidate.timeLeft || currentQuestion.timeLimit);
      }
    } else if (activeCandidate.questions.length === 6 && !activeCandidate.score) {
      // Interview completed - generate score and summary
      finishInterview();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestionIndex, activeCandidate]);
  
  // Timer effect - restart on question index change, pause change, or new timeLeft
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isPaused || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, timeLeft, currentQuestionIndex]);

  // Persist only the minimal timer state to avoid overwriting fresher candidate data
  useEffect(() => {
    if (!activeCandidate) return;
    dispatch(updateCandidate({
      id: activeCandidate.id,
      currentQuestionIndex,
      timeLeft,
      isPaused
    }));
  }, [currentQuestionIndex, timeLeft, isPaused]);
  
  const submitAnswer = async () => {
    if (currentQuestionIndex >= 6) return;
    
    const currentQuestion = (candidates.find(c => c.id === candidate.id) || candidate).questions[currentQuestionIndex];
    const answerToSubmit = answer || "No answer provided (time ran out)";
    
    // Evaluate answer using Gemini API
    setLoading(true);
    try {
      const evaluation = await GeminiAPI.evaluateAnswer(
        currentQuestion.text,
        answerToSubmit,
        currentQuestion.difficulty
      );
      
      const updatedAnswers = [
        ...activeCandidate.answers,
        {
          questionId: currentQuestion.id,
          answer: answerToSubmit,
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
      setCurrentQuestionIndex(nextIndex);
      setTimeLeft(nextTimeLeft);
    } catch (err) {
      setNotice(err?.message || 'Answer evaluation failed via Gemini. Skipping score for this question.');
      console.error('Error evaluating answer:', err);
      
      // Fallback without evaluation
      const updatedAnswers = [
        ...activeCandidate.answers,
        {
          questionId: currentQuestion.id,
          answer: answerToSubmit,
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
      setCurrentQuestionIndex(nextIndex);
      setTimeLeft(nextTimeLeft);
    } finally {
      setLoading(false);
    }
  };
  
  const finishInterview = async () => {
    setLoading(true);
    
    try {
      // Calculate final score as average of all question scores
      let totalScore = 0;
      let answeredQuestions = 0;
      
      activeCandidate.answers.forEach(answer => {
        if (answer.score) {
          totalScore += answer.score;
          answeredQuestions++;
        }
      });
      
      // Compute out of 100. Unanswered count as 0
      const perQuestionScores = activeCandidate.answers.map(a => a.score || 0);
      const totalOutOfTen = perQuestionScores.reduce((s, n) => s + n, 0);
      const averageOutOfTen = totalOutOfTen / 6; // 6 questions
      const averageScore = Math.max(0, Math.min(100, Math.round(averageOutOfTen * 10)));
      
      // Generate summary using Gemini API
      const summary = await GeminiAPI.generateSummary(
        { role: 'Full Stack Developer (React/Node.js)' },
        activeCandidate.questions,
        activeCandidate.answers,
        averageScore
      );
      
      const updatedCandidate = {
        ...activeCandidate,
        interviewStatus: 'completed',
        score: averageScore,
        summary: summary
      };
      
      dispatch(updateCandidate(updatedCandidate));
    } catch (err) {
      setError('Failed to generate final score and summary. Please ensure Gemini API key is set.');
      console.error('Error generating final evaluation:', err);
      
      // Do not fabricate scores; complete with computed score and empty summary
      const updatedCandidate = {
        ...activeCandidate,
        interviewStatus: 'completed',
        score: Math.max(0, Math.min(100, Math.round(((activeCandidate.answers.reduce((s, a) => s + (a.score || 0), 0)) / 6) * 10))),
        summary: activeCandidate.summary || ''
      };
      dispatch(updateCandidate(updatedCandidate));
    } finally {
      setLoading(false);
    }
  };
  
  const togglePause = () => {
    setIsPaused(!isPaused);
  };
  
  const currentQuestion = activeCandidate.questions[currentQuestionIndex];
  
  if (activeCandidate.interviewStatus === 'completed') {
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
                    This demo is using mock AI responses. To enable real Gemini AI integration, 
                    please add your Gemini API key to the .env file.
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
  
  return (
    <div className="fade-in" style={{ 
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      width: '100%',
      height: '100%',
      padding: '2rem'
    }}>
      {!GeminiAPI.isApiKeyAvailable() && (
        <Alert 
          message="Gemini API key required" 
          description="Please add VITE_GEMINI_API_KEY in a .env file and restart the app to enable real question generation and evaluation."
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
      
      {showApiInfo && (
        <Alert
          message={
            <span>
              <ApiOutlined /> AI Integration Information
            </span>
          }
          description={
            <span>
              This demo is using mock AI responses. To enable real Gemini integration, 
              please add your Gemini API key to the .env file.
            </span>
          }
          type="info"
          showIcon
          closable
          onClose={() => setShowApiInfo(false)}
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
              {currentQuestion.text}
            </Text>
            
            <Divider />
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              <Text strong>Time remaining: </Text>
              <Text 
                strong 
                type={timeLeft < 10 ? 'danger' : timeLeft < 30 ? 'warning' : 'success'}
                style={{ fontSize: '1.2rem', marginLeft: '0.5rem' }}
              >
                {timeLeft}s
              </Text>
              <Progress 
                percent={Math.round(((currentQuestion.timeLimit - timeLeft) / currentQuestion.timeLimit) * 100)} 
                style={{ width: '200px', marginLeft: '1rem' }}
                status={timeLeft < 10 ? 'exception' : timeLeft < 30 ? 'normal' : 'success'}
              />
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