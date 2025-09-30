import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  addCandidate, 
  updateCandidate, 
  setCurrentCandidateId,
  setActiveTab
} from '../store/candidatesSlice';
import { Upload, Button, Form, Input, Card, Steps, Typography, Modal, Spin, Row, Col, Alert, Space, message } from 'antd';
import { UploadOutlined, UserOutlined, MailOutlined, PhoneOutlined, WarningOutlined, FilePdfOutlined, FileWordOutlined } from '@ant-design/icons';
import ResumeParser from '../utils/resumeParser';
import InterviewChat from './InterviewChat';

const { Title, Text } = Typography;
const { Step } = Steps;

const IntervieweeTab = () => {
  const dispatch = useDispatch();
  const candidates = useSelector(state => state.candidates.candidates);
  const currentCandidateId = useSelector(state => state.candidates.currentCandidateId);
  const activeTab = useSelector(state => state.candidates.activeTab);
  
  const [form] = Form.useForm();
  const [resumeFile, setResumeFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [submittedCandidate, setSubmittedCandidate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const currentCandidate = candidates.find(c => c.id === currentCandidateId);

  useEffect(() => {
    // Check if there's an unfinished session
    const unfinishedCandidates = candidates.filter(
      c => c.interviewStatus === 'in_progress' || c.interviewStatus === 'not_started'
    );
    
    if (unfinishedCandidates.length > 0 && !currentCandidateId) {
      setShowWelcomeBack(true);
    }
  }, [candidates, currentCandidateId]);

  const validateFile = (file) => {
    const isPdf = file.type === 'application/pdf';
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.type === 'application/msword';
    
    if (!isPdf && !isDocx) {
      message.error('Invalid file type. Please upload a PDF or DOCX file.');
      return false;
    }
    
    // Check file size (limit to 5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('File must be smaller than 5MB.');
      return false;
    }
    
    return true;
  };

  const handleUpload = async (file) => {
    // Validate file type
    if (!validateFile(file)) {
      return false;
    }
    
    setLoading(true);
    message.info('Processing your resume...');
    try {
      const data = await ResumeParser.parse(file);
      setParsedData(data);
      setResumeFile(file);
      
      // Check for missing fields
      const missing = [];
      if (!data.name) missing.push('name');
      if (!data.email) missing.push('email');
      if (!data.phone) missing.push('phone');
      setMissingFields(missing);
      
      // Update form data
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || ''
      });
      
      // Prefill form with parsed data
      form.setFieldsValue({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || ''
      });
      
      message.success('Resume processed successfully!');
    } catch (error) {
      console.error('Error parsing resume:', error);
      message.error(`Failed to parse resume: ${error.message || 'Unknown error occurred'}. Please try another file.`);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const onFinish = async (values) => {
    try {
      const candidateData = {
        id: Date.now().toString(),
        ...values,
        resumeFile: resumeFile ? URL.createObjectURL(resumeFile) : null,
        interviewStatus: 'not_started',
        answers: [],
        questions: [],
        currentQuestionIndex: 0,
        timeLeft: 0,
        isPaused: false,
        score: null,
        summary: '',
        createdAt: new Date().toISOString()
      };

      dispatch(addCandidate(candidateData));
      dispatch(setCurrentCandidateId(candidateData.id));
      
      // Set submitted candidate to show InterviewChat immediately
      setSubmittedCandidate(candidateData);
    } catch (error) {
      console.error('Error starting interview:', error);
      message.error(`Failed to start interview: ${error.message || 'Unknown error occurred'}. Please try again.`);
    }
  };

  const selectUnfinishedSession = (candidateId) => {
    dispatch(setCurrentCandidateId(candidateId));
    setShowWelcomeBack(false);
  };

  const startNewSession = () => {
    setShowWelcomeBack(false);
    // Reset all states
    setParsedData(null);
    setResumeFile(null);
    setMissingFields([]);
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
    form.resetFields();
  };

  // Show InterviewChat immediately after form submission
  if (submittedCandidate) {
    return <InterviewChat />;
  }

  if (currentCandidate && 
      (currentCandidate.interviewStatus === 'in_progress' || 
       currentCandidate.interviewStatus === 'completed')) {
    return <InterviewChat />;
  }

  // Determine current step for the workflow
  const getCurrentStep = () => {
    // Step 0: No resume yet
    if (!parsedData) return 0;
    // Step 2: After form submit, or resuming active/completed interview
    if (submittedCandidate) return 2;
    if (
      currentCandidate &&
      (currentCandidate.interviewStatus === 'in_progress' || currentCandidate.interviewStatus === 'completed')
    ) return 2;
    // Otherwise, show fill details step even if a stale currentCandidateId exists
    return 1;
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
      <Title level={2}>Candidate Information</Title>
      
      <Modal
        title="Welcome Back!"
        open={showWelcomeBack}
        onCancel={() => setShowWelcomeBack(false)}
        closable={false}
        maskClosable={false}
        footer={[
          <Button key="new" onClick={startNewSession}>
            Start New Interview
          </Button>
        ]}
      >
        <Text>You have unfinished interviews. Would you like to continue one?</Text>
        <div style={{ marginTop: '1rem' }}>
          {candidates
            .filter(c => c.interviewStatus === 'in_progress' || c.interviewStatus === 'not_started')
            .map(candidate => (
              <Card 
                key={candidate.id} 
                style={{ marginBottom: '10px', cursor: 'pointer' }}
                hoverable
                onClick={() => selectUnfinishedSession(candidate.id)}
              >
                <Text strong>{candidate.name || 'Unnamed Candidate'}</Text>
                <br />
                <Text type="secondary">Status: {candidate.interviewStatus === 'in_progress' ? 'In Progress' : 'Not Started'}</Text>
              </Card>
            ))
          }
        </div>
      </Modal>

      <Card style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <Steps
            current={getCurrentStep()}
            items={[
              {
                title: 'Upload Resume',
              },
              {
                title: 'Fill Details',
              },
              {
                title: 'Start Interview',
              },
            ]}
            size="small"
          />
        </div>

        {/* Always show all steps, but conditionally display content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Step 1: Upload Resume */}
          <div style={{ 
            display: getCurrentStep() === 0 ? 'block' : 'none',
            flex: 1
          }}>
            <Card style={{ 
              maxWidth: '600px', 
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <Title level={4}>
                <FilePdfOutlined style={{ marginRight: '0.5rem' }} />
                Upload Your Resume
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '1.5rem' }}>
                Please upload your resume in PDF or DOCX format
              </Text>
              
              <Upload
                beforeUpload={handleUpload}
                maxCount={1}
                accept=".pdf,.doc,.docx"
                showUploadList={false}
                disabled={loading}
              >
                <Button 
                  icon={loading ? null : <UploadOutlined />} 
                  size="large"
                  loading={loading}
                  style={{ 
                    padding: '1rem 2rem', 
                    height: 'auto',
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? 'Processing Resume...' : 'Click to Upload Resume'}
                </Button>
              </Upload>
              
              <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <Text strong>Supported formats:</Text>
                <ul style={{ marginTop: '0.5rem' }}>
                  <li><FilePdfOutlined style={{ color: '#ff4d4f', marginRight: '0.5rem' }} /> PDF (.pdf)</li>
                  <li><FileWordOutlined style={{ color: '#1890ff', marginRight: '0.5rem' }} /> Word Document (.doc, .docx)</li>
                </ul>
              </div>
              
              {loading && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Spin tip="Extracting information from your resume..." />
                </div>
              )}
            </Card>
          </div>

          {/* Step 2: Fill Details */}
          <div style={{ 
            display: getCurrentStep() === 1 ? 'block' : 'none',
            flex: 1
          }}>
            <Card>
              <Title level={4}>Verify Your Information</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '1.5rem' }}>
                Please verify and complete the information extracted from your resume
              </Text>
              
              {missingFields.length > 0 && (
                <Alert
                  message={
                    <span>
                      <WarningOutlined /> Missing Information
                    </span>
                  }
                  description={
                    <span>
                      The following fields were not found in your resume. Please fill them in:
                      <ul style={{ margin: '0.5rem 0' }}>
                        {missingFields.map(field => (
                          <li key={field}>
                            {field === 'name' && 'Full Name'}
                            {field === 'email' && 'Email Address'}
                            {field === 'phone' && 'Phone Number'}
                          </li>
                        ))}
                      </ul>
                    </span>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: '1.5rem' }}
                />
              )}
              
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ flex: 1 }}>
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please enter your full name!' }]}
                    initialValue={formData.name}
                  >
                    <Input 
                      size="large" 
                      placeholder="Enter your full name"
                      prefix={<UserOutlined />}
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { required: true, message: 'Please enter your email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                    initialValue={formData.email}
                  >
                    <Input 
                      size="large" 
                      placeholder="Enter your email address"
                      prefix={<MailOutlined />}
                    />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[{ required: true, message: 'Please enter your phone number!' }]}
                    initialValue={formData.phone}
                  >
                    <Input 
                      size="large" 
                      placeholder="Enter your phone number"
                      prefix={<PhoneOutlined />}
                    />
                  </Form.Item>
                </div>

                <Form.Item style={{ marginTop: 'auto' }}>
                  <Space>
                    <Button 
                      onClick={startNewSession}
                    >
                      Back
                    </Button>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large"
                    >
                      Start Interview
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </div>

          {/* Step 3: Start Interview (this will be handled by the redirect) */}
          <div style={{ 
            display: getCurrentStep() === 2 ? 'flex' : 'none',
            flex: 1,
            textAlign: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Spin size="large" />
            <Text style={{ display: 'block', marginTop: '1rem', fontSize: '1.2rem' }}>
              Preparing your interview...
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IntervieweeTab;