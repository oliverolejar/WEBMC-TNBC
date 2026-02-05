import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LiveDashboard from '../screens/LiveDashboard';
import RecoveryPredict from '../screens/RecoveryPredict';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LiveDashboard />} />
        <Route path="/recovery" element={<RecoveryPredict />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
