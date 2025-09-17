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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
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
    success: 'border-green-200 bg-green-50 text-green-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
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
        'rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out',
        typeStyles[toast.type]
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-lg">
          {iconMap[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-medium mb-1">{toast.title}</div>
          )}
          <div className="text-sm">{toast.message}</div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Convenience hooks for different toast types
export function useErrorToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action'] }) => {
    addToast({
      type: 'error',
      message,
      title: options?.title,
      action: options?.action,
      duration: 7000 // Longer duration for errors
    });
  }, [addToast]);
}

export function useSuccessToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string }) => {
    addToast({
      type: 'success',
      message,
      title: options?.title,
      duration: 4000
    });
  }, [addToast]);
}

export function useWarningToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string; action?: Toast['action'] }) => {
    addToast({
      type: 'warning',
      message,
      title: options?.title,
      action: options?.action,
      duration: 6000
    });
  }, [addToast]);
}

export function useInfoToast() {
  const { addToast } = useToast();
  
  return useCallback((message: string, options?: { title?: string }) => {
    addToast({
      type: 'info',
      message,
      title: options?.title,
      duration: 5000
    });
  }, [addToast]);
}