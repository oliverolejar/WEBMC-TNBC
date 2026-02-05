import React from 'react';

const LineChartPlaceholder: React.FC = () => {
  return (
    <div className="placeholder-chart">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 0 50 C 20 20, 40 80, 60 50 S 80 20, 100 50" stroke="gray" fill="transparent" strokeWidth="1"/>
        {/* Axes */}
        <line x1="0" y1="98" x2="100" y2="98" stroke="lightgray" strokeWidth="0.5" />
        <line x1="2" y1="0" x2="2" y2="100" stroke="lightgray" strokeWidth="0.5" />
      </svg>
    </div>
  );
};

export default LineChartPlaceholder;
