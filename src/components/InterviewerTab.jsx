import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentCandidateId, setActiveTab, setViewMode, resetInterview } from '../store/candidatesSlice';
import { Table, Card, Button, Typography, Input, Space, Tag, Row, Col } from 'antd';
import { SearchOutlined, EyeOutlined, RedoOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

const InterviewerTab = () => {
  const dispatch = useDispatch();
  const candidates = useSelector(state => state.candidates.candidates);
  
  const [searchText, setSearchText] = useState('');
  
  // Filter candidates based on search text
  const filteredCandidates = candidates.filter(candidate => 
    candidate.name.toLowerCase().includes(searchText.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchText.toLowerCase())
  );
  
  // Sort candidates by score (highest first), then by completion status
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    // Completed interviews first
    if (a.interviewStatus === 'completed' && b.interviewStatus !== 'completed') return -1;
    if (b.interviewStatus === 'completed' && a.interviewStatus !== 'completed') return 1;
    
    // Then by score (if both completed)
    if (a.interviewStatus === 'completed' && b.interviewStatus === 'completed') {
      return (b.score || 0) - (a.score || 0);
    }
    
    // For incomplete interviews, sort by creation date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  const columns = [
    {
      title: 'Candidate',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: '1.1rem' }}>{text}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'interviewStatus',
      key: 'status',
      render: (status) => {
        switch (status) {
          case 'not_started':
            return <Tag icon={<PlayCircleOutlined />} color="default">Not Started</Tag>;
          case 'in_progress':
            return <Tag icon={<ClockCircleOutlined />} color="processing">In Progress</Tag>;
          case 'completed':
            return <Tag icon={<CheckCircleOutlined />} color="success">Completed</Tag>;
          default:
            return <Tag color="default">Unknown</Tag>;
        }
      },
      filters: [
        { text: 'Not Started', value: 'not_started' },
        { text: 'In Progress', value: 'in_progress' },
        { text: 'Completed', value: 'completed' },
      ],
      onFilter: (value, record) => record.interviewStatus === value,
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => {
        if (record.interviewStatus !== 'completed') {
          return <Text type="secondary">N/A</Text>;
        }
        
        let color = 'red';
        if (score >= 80) color = 'green';
        else if (score >= 60) color = 'orange';
        
        return <Text strong style={{ color }}>{score}/100</Text>;
      },
      sorter: (a, b) => (b.score || 0) - (a.score || 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => viewCandidateDetails(record)}
            type="primary"
            ghost
          >
            View Details
          </Button>
          {(record.interviewStatus === 'completed' || record.interviewStatus === 'in_progress') && (
            <Button 
              icon={<RedoOutlined />} 
              onClick={() => restartInterview(record)}
              danger
              ghost
            >
              Restart
            </Button>
          )}
        </Space>
      ),
    },
  ];
  
  const viewCandidateDetails = (candidate) => {
    dispatch(setCurrentCandidateId(candidate.id));
    // Keep the interviewer tab selected while opening details view
    dispatch(setActiveTab('interviewer'));
    dispatch(setViewMode('details'));
  };
  
  const restartInterview = (candidate) => {
    dispatch(resetInterview(candidate.id));
    dispatch(setViewMode('tabs'));
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
      <Title level={2}>Interview Dashboard</Title>
      
      <Card style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Row gutter={16} style={{ marginBottom: '1.5rem' }}>
          <Col span={6}>
            <Card size="small">
              <Text strong>Total Candidates</Text>
              <br />
              <Text style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{candidates.length}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Text strong>Completed</Text>
              <br />
              <Text type="success" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {candidates.filter(c => c.interviewStatus === 'completed').length}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Text strong>In Progress</Text>
              <br />
              <Text type="warning" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {candidates.filter(c => c.interviewStatus === 'in_progress').length}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Text strong>Not Started</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {candidates.filter(c => c.interviewStatus === 'not_started').length}
              </Text>
            </Card>
          </Col>
        </Row>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <Search
            placeholder="Search candidates by name or email"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ flex: 1 }}>
          <Table 
            dataSource={sortedCandidates} 
            columns={columns} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            style={{ width: '100%' }}
          />
          
          {sortedCandidates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <UserOutlined style={{ fontSize: '3rem', color: '#94a3b8' }} />
              <Text type="secondary" style={{ display: 'block', marginTop: '1rem', fontSize: '1.1rem' }}>
                No candidates found
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InterviewerTab;