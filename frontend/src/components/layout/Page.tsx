import React from 'react';
import { cn } from '@/utils/utils';

interface PageProps {
  children: React.ReactNode;
  className?: string;
}

const Page: React.FC<PageProps> = ({ children, className }) => {
  return (
    <div className={cn("mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-6 space-y-6", className)}>
      {children}
    </div>
  );
};

export default Page;
