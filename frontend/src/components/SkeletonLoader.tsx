import React from 'react';
import { cn } from '@/utils/utils';

interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/40", className)}
      {...props}
    />
  );
};

export default SkeletonLoader;
