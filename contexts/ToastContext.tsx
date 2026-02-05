import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 8000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 6000 });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const config = {
    success: {
      icon: CheckCircle2,
      bgClass: 'bg-emerald-950/90 border-emerald-500/50',
      iconClass: 'text-emerald-400',
      titleClass: 'text-emerald-300',
    },
    error: {
      icon: XCircle,
      bgClass: 'bg-red-950/90 border-red-500/50',
      iconClass: 'text-red-400',
      titleClass: 'text-red-300',
    },
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-yellow-950/90 border-yellow-500/50',
      iconClass: 'text-yellow-400',
      titleClass: 'text-yellow-300',
    },
    info: {
      icon: Info,
      bgClass: 'bg-blue-950/90 border-blue-500/50',
      iconClass: 'text-blue-400',
      titleClass: 'text-blue-300',
    },
  };

  const { icon: Icon, bgClass, iconClass, titleClass } = config[toast.type];

  return (
    <div 
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl
        animate-in slide-in-from-right-full fade-in duration-300
        ${bgClass}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${titleClass}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{toast.message}</p>
        )}
      </div>
      <button 
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};