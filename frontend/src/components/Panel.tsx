import React from 'react';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode; // New prop for actions
  timestamp?: string; // New prop for timestamp
}

const Panel: React.FC<PanelProps> = ({ title, children, className, actions, timestamp }) => {
  return (
    <div className={`bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {(title || actions || timestamp) && (
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/40">
          {title && <h2 className="text-base font-semibold tracking-tight text-foreground/90">{title}</h2>}
          <div className="flex items-center gap-4">
            {timestamp && <span className="text-xs font-medium text-muted-foreground">{timestamp}</span>}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Panel;
