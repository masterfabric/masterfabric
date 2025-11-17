'use client';

import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ProgressStatus = 'loading' | 'success' | 'error' | 'warning' | 'pending';

export interface ProgressCardProps {
  status: ProgressStatus;
  title: string;
  description?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  showProgress?: boolean;
  progress?: number; // 0-100
  className?: string;
}

const statusConfig = {
  loading: {
    icon: Loader2,
    iconClass: 'text-blue-600 dark:text-blue-400 animate-spin',
    borderClass: 'border-blue-600 dark:border-blue-400',
    titleClass: 'text-foreground',
    descriptionClass: 'text-muted-foreground',
    containerClass: 'border-border',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-600 dark:text-green-400',
    borderClass: 'border-green-600 dark:border-green-400',
    titleClass: 'text-green-900 dark:text-green-100',
    descriptionClass: 'text-green-700 dark:text-green-300',
    containerClass: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-600 dark:border-red-400',
    titleClass: 'text-red-900 dark:text-red-100',
    descriptionClass: 'text-red-700 dark:text-red-300',
    containerClass: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20',
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    borderClass: 'border-yellow-600 dark:border-yellow-400',
    titleClass: 'text-yellow-900 dark:text-yellow-100',
    descriptionClass: 'text-yellow-700 dark:text-yellow-300',
    containerClass: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20',
  },
  pending: {
    icon: Clock,
    iconClass: 'text-gray-600 dark:text-gray-400',
    borderClass: 'border-gray-600 dark:border-gray-400',
    titleClass: 'text-foreground',
    descriptionClass: 'text-muted-foreground',
    containerClass: 'border-border',
  },
};

export function ProgressCard({
  status,
  title,
  description,
  onCancel,
  cancelLabel = 'Cancel',
  showProgress = false,
  progress = 0,
  className = '',
}: ProgressCardProps) {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <Card className={`${config.containerClass} ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="relative w-16 h-16">
            {status === 'loading' ? (
              <div className={`w-16 h-16 rounded-full bg-background dark:bg-gray-800 flex items-center justify-center border-2 ${config.borderClass || 'border-border'}`}>
                <IconComponent className={`${config.iconClass} h-8 w-8`} />
              </div>
            ) : (
              <div className={`w-16 h-16 rounded-full bg-background dark:bg-gray-800 flex items-center justify-center border-2 ${config.borderClass || 'border-border'}`}>
                <IconComponent className={`${config.iconClass} h-8 w-8`} />
              </div>
            )}
          </div>
        </div>
        <CardTitle className={`${config.titleClass} text-xl`}>
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={`${config.descriptionClass} mt-2`}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      {showProgress && status === 'loading' && (
        <CardContent className="px-6 pb-4">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">
            {progress}%
          </div>
        </CardContent>
      )}
      {onCancel && (
        <CardContent className="pt-0 pb-6">
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="min-w-[100px]"
            >
              {cancelLabel}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Processing Request Card - Specific variant for processing requests
export interface ProcessingRequestCardProps {
  title?: string;
  description?: string;
  onCancel?: () => void;
  showProgress?: boolean;
  progress?: number;
}

export function ProcessingRequestCard({
  title = 'Processing your request',
  description = 'Please wait while we process your request. Do not refresh the page.',
  onCancel,
  showProgress = false,
  progress = 0,
}: ProcessingRequestCardProps) {
  return (
    <ProgressCard
      status="loading"
      title={title}
      description={description}
      onCancel={onCancel}
      cancelLabel="Cancel"
      showProgress={showProgress}
      progress={progress}
      className="max-w-md mx-auto"
    />
  );
}

// Progress Card Group - Container for multiple progress cards
export interface ProgressCardGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function ProgressCardGroup({
  children,
  columns = 2,
  className = '',
}: ProgressCardGroupProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
}

