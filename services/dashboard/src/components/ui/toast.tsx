'use client';

import { useState, useEffect } from 'react';
import { Info, CheckCircle2, XCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const variantStyles = {
  default: {
    container: 'bg-background border-border',
    icon: 'text-foreground',
    title: 'text-foreground',
    description: 'text-muted-foreground',
  },
  success: {
    container: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    description: 'text-green-700 dark:text-green-300',
  },
  error: {
    container: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    description: 'text-red-700 dark:text-red-300',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    description: 'text-yellow-700 dark:text-yellow-300',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-700 dark:text-blue-300',
  },
};

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: AlertCircle,
};

export function Toast({
  variant = 'default',
  title,
  description,
  duration,
  onClose,
  action,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for animation
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = variantStyles[variant];
  const IconComponent = variantIcons[variant];

  if (!isVisible) {
    return null;
  }

  return (
    <Card
      className={`${styles.container} border p-4 shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={`${styles.icon} h-5 w-5 flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && (
            <div className={`${styles.title} font-semibold text-sm mb-1`}>
              {title}
            </div>
          )}
          {description && (
            <div className={`${styles.description} text-sm`}>
              {description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className={`${styles.title} h-7 px-2 text-xs`}
            >
              {action.label}
            </Button>
          )}
          {onClose && (
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className={`${styles.description} hover:opacity-70 transition-opacity`}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Toast Container Component for managing multiple toasts
export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ toasts, onRemove, position = 'top-right' }: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none`}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            action={toast.action}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showSuccess = (title: string, description?: string, duration?: number) => {
    return addToast({ variant: 'success', title, description, duration });
  };

  const showError = (title: string, description?: string, duration?: number) => {
    return addToast({ variant: 'error', title, description, duration });
  };

  const showWarning = (title: string, description?: string, duration?: number) => {
    return addToast({ variant: 'warning', title, description, duration });
  };

  const showInfo = (title: string, description?: string, duration?: number) => {
    return addToast({ variant: 'info', title, description, duration });
  };

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

