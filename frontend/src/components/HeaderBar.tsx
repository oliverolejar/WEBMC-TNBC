import React from 'react';

interface HeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction }) => {
  return (
    <header className="bg-white shadow-md h-14 flex items-center px-6">
      <div className="w-1/3">{leftAction}</div>
      <div className="w-1/3 text-center">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="w-1/3 flex justify-end">{rightAction}</div>
    </header>
  );
};

export default Header;
