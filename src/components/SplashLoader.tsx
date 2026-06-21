import React, { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface SplashLoaderProps {
  isFinished: boolean;
  onComplete: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ isFinished, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing secure session...');
  const [isExiting, setIsExiting] = useState(false);

  // 1. Progress simulation up to 90%
  useEffect(() => {
    let intervalTime = 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (isFinished) {
          clearInterval(timer);
          return prev;
        }

        if (prev >= 90) {
          clearInterval(timer);
          return 90; // Hold at 90% until backend is initialized
        }

        // Dynamic status updates based on simulated progress
        if (prev < 20) {
          setStatusText('Connecting to database...');
        } else if (prev < 45) {
          setStatusText('Authenticating session...');
        } else if (prev < 70) {
          setStatusText('Syncing accounts & assets...');
        } else {
          setStatusText('Applying settings...');
        }

        // Random organic increment between 2% and 8%
        const increment = Math.floor(Math.random() * 7) + 2;
        return Math.min(prev + increment, 90);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isFinished]);

  // 2. Accelerate progress to 100% when backend auth initialization completes
  useEffect(() => {
    if (isFinished) {
      setStatusText('Sync complete! Loading dashboard...');
      
      const fastTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(fastTimer);
            // Trigger exit transition
            setTimeout(() => {
              setIsExiting(true);
              // Wait for transition duration to call onComplete
              setTimeout(onComplete, 350);
            }, 250);
            return 100;
          }
          return prev + 10;
        });
      }, 30);

      return () => clearInterval(fastTimer);
    }
  }, [isFinished, onComplete]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b19] text-white transition-all duration-300 ease-in-out',
        isExiting ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      )}
    >
      <div className="flex flex-col items-center max-w-xs px-6 text-center space-y-8">
        
        {/* Glow backdrop behind logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse h-20 w-20 mx-auto" />
          
          {/* Logo container with rotation outline effect */}
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-2xl shadow-primary/20 animate-pulse border border-white/10">
            BB
            {/* Ambient loading orbit border ring */}
            <div className="absolute -inset-1 rounded-2xl border border-primary/40 animate-ping opacity-25" />
          </div>
        </div>

        {/* Branding text */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
            BudgetBuddy
          </h1>
          <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest leading-none">
            Student Financial Hub
          </p>
        </div>

        {/* Linear progress bar */}
        <div className="w-48 space-y-2">
          <div className="h-1 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-primary via-violet-500 to-indigo-500 rounded-full transition-all duration-200 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold px-0.5">
            <span className="truncate max-w-[130px] transition-all duration-300">
              {statusText}
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};
