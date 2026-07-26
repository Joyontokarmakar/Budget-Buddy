import React from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { X, CheckCircle2, AlertCircle, Bell, Info } from 'lucide-react';
import { cn } from '../utils/cn';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-[340px] px-4 pointer-events-none sm:px-0">
      {toasts.map((toast) => {
        const Icon = toast.type === 'success' 
          ? CheckCircle2 
          : toast.type === 'destructive' 
          ? AlertCircle 
          : toast.type === 'warning'
          ? Bell
          : Info;

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto w-full p-4 rounded-2xl shadow-xl flex gap-3 items-start border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5",
              {
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400": toast.type === 'success',
                "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400": toast.type === 'destructive',
                "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400": toast.type === 'warning',
                "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400": toast.type === 'info',
              }
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black tracking-wide leading-tight">{toast.title}</h4>
              <p className="text-[11px] font-semibold opacity-90 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-muted/20 rounded-lg shrink-0 cursor-pointer transition-colors"
            >
              <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
