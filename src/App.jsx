import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import { Layout, Tabs } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTab } from './store/candidatesSlice';
import IntervieweeTab from './components/IntervieweeTab';
import InterviewerTab from './components/InterviewerTab';
import CandidateDetailView from './components/CandidateDetailView';
import './App.css';

const { Header, Content } = Layout;

// Create a component that can access Redux state
const AppContent = () => {
  const dispatch = useDispatch();
  const activeTab = useSelector(state => state.candidates.activeTab);
  const currentCandidateId = useSelector(state => state.candidates.currentCandidateId);
  const candidates = useSelector(state => state.candidates.candidates);
  const viewMode = useSelector(state => state.candidates.viewMode);
  
  const currentCandidate = candidates.find(c => c.id === currentCandidateId);
  
  // Handle tab change
  const onTabChange = (key) => {
    dispatch(setActiveTab(key));
  };
  
  // Determine which view to show
  const renderContent = () => {
    // Respect explicit view mode for details view
    if (viewMode === 'details' && currentCandidateId && currentCandidate) {
      return <CandidateDetailView />;
    }

    return (
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={[
          {
            key: 'interviewee',
            label: 'Interviewee',
            children: <IntervieweeTab />,
          },
          {
            key: 'interviewer',
            label: 'Interviewer',
            children: <InterviewerTab />,
          },
        ]}
        className="fade-in"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1,
          width: '100%',
          height: '100%'
        }}
      />
    );
  };
  
  return (
    <Layout className="layout">
      <Header className="header">
        <div className="logo">
          <h1>AI Interview Assistant</h1>
        </div>
      </Header>
      <Content className="site-layout-content">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1,
          width: '100%',
          height: '100%'
        }}>
          {renderContent()}
        </div>
      </Content>
    </Layout>
  );
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;