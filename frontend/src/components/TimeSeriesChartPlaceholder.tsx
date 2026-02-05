import React from 'react';

interface TimeSeriesChartPlaceholderProps {
  leftAxisLabel: string;
  bottomAxisLabel: string;
}

const TimeSeriesChartPlaceholder: React.FC<TimeSeriesChartPlaceholderProps> = ({ leftAxisLabel, bottomAxisLabel }) => {
  return (
    <div className="relative placeholder-chart" style={{ height: '250px' }}>
       <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Axes */}
        <line x1="5" y1="95" x2="95" y2="95" stroke="#a0a0a0" strokeWidth="0.5" />
        <line x1="5" y1="5" x2="5" y2="95" stroke="#a0a0a0" strokeWidth="0.5" />

        {/* Healthy baseline */}
        <line x1="5" y1="30" x2="95" y2="30" stroke="#4ade80" strokeWidth="1" strokeDasharray="2,2" />
        
        {/* Unhealthy trend */}
        <path d="M 5 80 C 30 70, 60 50, 95 40" stroke="#f87171" fill="transparent" strokeWidth="1"/>

      </svg>
      <span className="absolute top-2 left-0 transform -rotate-90 origin-top-left -translate-x-full ml-2 text-xs text-gray-500">{leftAxisLabel}</span>
      <span className="absolute bottom-1 right-1/2 translate-x-1/2 text-xs text-gray-500">{bottomAxisLabel}</span>

      <div className='absolute top-2 right-2 text-xs'>
        <div className='flex items-center'><div className='w-3 h-0.5 bg-green-400 mr-1'></div> healthy</div>
        <div className='flex items-center'><div className='w-3 h-0.5 bg-red-400 mr-1'></div> unhealthy</div>
      </div>
    </div>
  );
};

export default TimeSeriesChartPlaceholder;
