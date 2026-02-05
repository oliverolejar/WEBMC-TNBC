import React from 'react';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ title, children, className }) => {
  return (
    <div className={`panel ${className}`}>
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </div>
  );
};

export default Panel;
