import React from 'react';
import { PackageX } from 'lucide-react';
import { Button } from './Button'; // Assuming Button is in components/Button or components/ui/button
import { cn } from '@/utils/utils';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  cta?: {
    text: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline';
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageX,
  title,
  description,
  cta,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center text-muted-foreground",
        className
      )}
    >
      <Icon className="h-12 w-12 mb-4" />
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      {description && <p className="mb-4 text-sm max-w-sm">{description}</p>}
      {cta && (
        <Button onClick={cta.onClick} variant={cta.variant || 'default'}>
          {cta.text}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
