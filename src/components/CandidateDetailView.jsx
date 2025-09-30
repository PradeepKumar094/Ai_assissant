import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Card, Typography, List, Divider, Row, Col, Tag, Progress } from 'antd';
import { ArrowLeftOutlined, UserOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { setActiveTab, setCurrentCandidateId, setViewMode } from '../store/candidatesSlice';

const { Title, Text } = Typography;

const CandidateDetailView = () => {
  const dispatch = useDispatch();
  const candidates = useSelector(state => state.candidates.candidates);
  const currentCandidateId = useSelector(state => state.candidates.currentCandidateId);
  
  const candidate = candidates.find(c => c.id === currentCandidateId);
  
  if (!candidate) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%'
      }}>
        <Text>Candidate not found</Text>
      </div>
    );
  }
  
  const goBack = () => {
    dispatch(setCurrentCandidateId(null));
    dispatch(setActiveTab('interviewer'));
    dispatch(setViewMode('tabs'));
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'processing';
      case 'not_started': return 'default';
      default: return 'default';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />;
      case 'in_progress': return <ClockCircleOutlined />;
      case 'not_started': return <ClockCircleOutlined />;
      default: return null;
    }
  };
  
  return (
    <div className="fade-in" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1,
      width: '100%',
      height: '100%',
      padding: '2rem'
    }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={goBack} 
        style={{ marginBottom: '1.5rem' }}
        size="large"
      >
        Back to Dashboard
      </Button>
      
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}>
        <Row gutter={24} style={{ marginBottom: '1.5rem' }}>
          <Col span={24}>
            <Card>
              <Title level={2} style={{ marginTop: 0 }}>
                <UserOutlined style={{ marginRight: '0.5rem' }} />
                {candidate.name}
              </Title>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong><MailOutlined style={{ marginRight: '0.5rem' }} />Email:</Text>
                  <br />
                  <Text>{candidate.email}</Text>
                </Col>
                <Col span={8}>
                  <Text strong><PhoneOutlined style={{ marginRight: '0.5rem' }} />Phone:</Text>
                  <br />
                  <Text>{candidate.phone || 'Not provided'}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>Status:</Text>
                  <br />
                  <Tag icon={getStatusIcon(candidate.interviewStatus)} color={getStatusColor(candidate.interviewStatus)}>
                    {candidate.interviewStatus === 'not_started' && 'Not Started'}
                    {candidate.interviewStatus === 'in_progress' && 'In Progress'}
                    {candidate.interviewStatus === 'completed' && 'Completed'}
                  </Tag>
                </Col>
              </Row>
              
              {candidate.resumeFile && (
                <Row style={{ marginTop: '1rem' }}>
                  <Col span={24}>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      href={candidate.resumeFile}
                      target="_blank"
                      download={`${candidate.name.replace(/\s+/g, '_')}_resume`}
                    >
                      Download Resume
                    </Button>
                  </Col>
                </Row>
              )}
              
              {candidate.score && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Text strong>Final Score:</Text>
                  <Progress 
                    percent={candidate.score} 
                    status="active" 
                    style={{ marginTop: '0.5rem' }}
                  />
                  <Text style={{ fontSize: '1.5rem', fontWeight: 'bold', marginLeft: '1rem' }}>
                    {candidate.score}/100
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
        
        {candidate.summary && (
          <Row gutter={24} style={{ marginBottom: '1.5rem' }}>
            <Col span={24}>
              <Card>
                <Title level={4}>
                  <CheckCircleOutlined style={{ marginRight: '0.5rem' }} />
                  AI Summary
                </Title>
                <Text>{candidate.summary}</Text>
              </Card>
            </Col>
          </Row>
        )}
        
        <Row gutter={24} style={{ flex: 1 }}>
          <Col span={24}>
            <Card style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <Title level={4}>
                <ClockCircleOutlined style={{ marginRight: '0.5rem' }} />
                Interview Questions & Answers
              </Title>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {candidate.questions.length === 0 ? (
                  <Text>No questions answered yet</Text>
                ) : (
                  <List
                    itemLayout="vertical"
                    dataSource={candidate.questions}
                    renderItem={(question, index) => {
                      const answer = candidate.answers.find(a => a.questionId === question.id);
                      return (
                        <List.Item key={question.id}>
                          <Text strong>Q{index + 1}: {question.text}</Text>
                          <br />
                          <Tag color={question.difficulty === 'Easy' ? 'success' : question.difficulty === 'Medium' ? 'warning' : 'error'}>
                            {question.difficulty}
                          </Tag>
                          <br />
                          {answer ? (
                            <div style={{ marginTop: '1rem' }}>
                              <Text strong>Answer:</Text>
                              <p style={{ 
                                background: '#f8fafc', 
                                padding: '1rem', 
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                marginTop: '0.5rem'
                              }}>
                                {answer.text}
                              </p>
                              {answer.score && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <Text strong>Score: </Text>
                                  <Text type={answer.score >= 8 ? 'success' : answer.score >= 6 ? 'warning' : 'danger'}>
                                    {answer.score}/10
                                  </Text>
                                  {answer.feedback && (
                                    <p style={{ 
                                      background: '#f0f9ff', 
                                      padding: '0.5rem', 
                                      borderRadius: '4px',
                                      border: '1px solid #bae6fd',
                                      marginTop: '0.5rem',
                                      fontStyle: 'italic'
                                    }}>
                                      {answer.feedback}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Text type="secondary">Not answered yet</Text>
                          )}
                          <Divider />
                        </List.Item>
                      );
                    }}
                  />
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default CandidateDetailView;