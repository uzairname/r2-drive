import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../lib/utils';

interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const typeStyles = {
    success: 'border-green-600/20 bg-green-50 text-green-900 dark:border-green-400/30 dark:bg-green-950/50 dark:text-green-100',
    error: 'border-red-600/20 bg-red-50 text-red-900 dark:border-red-400/30 dark:bg-red-950/50 dark:text-red-100',
    warning: 'border-yellow-600/20 bg-yellow-50 text-yellow-900 dark:border-yellow-400/30 dark:bg-yellow-950/50 dark:text-yellow-100',
    info: 'border-border bg-card text-card-foreground'
  };

  const iconStyles = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-muted-foreground'
  };

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out animate-in slide-in-from-right-full',
        typeStyles[toast.type]
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 text-lg font-medium", iconStyles[toast.type])}>
          {iconMap[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold mb-1 text-sm">{toast.title}</div>
          )}
          <div className="text-sm opacity-90">{toast.message}</div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-3 text-sm font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors cursor-pointer"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors rounded-sm p-1 hover:bg-accent cursor-pointer"
          aria-label="Close notification"
        >
          <svg 
            className="h-4 w-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Convenience hooks for different toast types
export function useErrorToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action']; duration?: number }) => {
    addToast({
      type: 'error',
      message,
      title: options?.title || 'Error',
      action: options?.action,
      duration: options?.duration ?? 8000 // Longer duration for errors
    });
  }, [addToast]);
}

export function useSuccessToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string; duration?: number }) => {
    addToast({
      type: 'success',
      message,
      title: options?.title || 'Success',
      duration: options?.duration ?? 4000
    });
  }, [addToast]);
}

export function useWarningToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action']; duration?: number }) => {
    addToast({
      type: 'warning',
      message,
      title: options?.title || 'Warning',
      action: options?.action,
      duration: options?.duration ?? 6000
    });
  }, [addToast]);
}

export function useInfoToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string; duration?: number }) => {
    addToast({
      type: 'info',
      message,
      title: options?.title,
      duration: options?.duration ?? 5000
    });
  }, [addToast]);
}