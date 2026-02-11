import React from 'react';
import Page from '../components/layout/Page'; // Will create this soon
import PageHeader from '../components/layout/PageHeader';

const LiveSession: React.FC = () => {
  return (
    <Page>
      <PageHeader title="Live Session" description="Monitor real-time biomechanical data." />
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg">Live session content coming soon...</p>
      </div>
    </Page>
  );
};

export default LiveSession;
