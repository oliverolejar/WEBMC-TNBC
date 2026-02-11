import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../screens/Home'; // New import
import SelectPatient from '../screens/SelectPatient'; // New import
import LiveDashboard from '../screens/LiveDashboard';
import RecoverySession from '../screens/RecoverySession';
import AppShell from '../components/AppShell';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<LiveDashboard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/select-patient" element={<SelectPatient />} />
          <Route path="/live-session" element={<LiveDashboard />} />
          <Route path="/recovery" element={<RecoverySession />} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default AppRouter;
