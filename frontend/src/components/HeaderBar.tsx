import React from 'react';

interface HeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const HeaderBar: React.FC<HeaderProps> = ({ title, leftAction, rightAction }) => {
  return (
    <header className="bg-primary text-primary-foreground shadow-sm h-16 flex items-center px-4 md:px-6">
      <div className="flex-1">
        {leftAction}
      </div>
      <div className="flex-none">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex-1 flex justify-end">
        {rightAction}
      </div>
    </header>
  );
};

export default HeaderBar;
