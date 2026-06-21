import React, { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface SplashLoaderProps {
  isFinished: boolean;
  onComplete: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ isFinished, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Checking credentials...');
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
          return 90; // Hold at 90% until backend auth resolves
        }

        // Dynamic status updates based on simulated progress
        if (prev < 25) {
          setStatusText('Connecting to database...');
        } else if (prev < 50) {
          setStatusText('Authenticating session...');
        } else if (prev < 75) {
          setStatusText('Syncing accounts & assets...');
        } else {
          setStatusText('Applying preferences...');
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
      setStatusText('Sync complete! Launching...');
      
      const fastTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(fastTimer);
            // Trigger exit transition
            setTimeout(() => {
              setIsExiting(true);
              // Wait for transition duration to call onComplete
              setTimeout(onComplete, 350);
            }, 200);
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
      {/* Styles for line-drawing and pulsing glow animations */}
      <style>{`
        @keyframes drawPath {
          0% {
            stroke-dashoffset: 400;
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          75% {
            stroke-dashoffset: 0;
            filter: drop-shadow(0 0 3px #00f0ff);
          }
          100% {
            stroke-dashoffset: 0;
            filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.95)) drop-shadow(0 0 16px rgba(0, 240, 255, 0.6));
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.7)) drop-shadow(0 0 12px rgba(0, 240, 255, 0.4));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.95)) drop-shadow(0 0 24px rgba(0, 240, 255, 0.7));
            transform: scale(1.02);
          }
        }
        .animate-logo-draw {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: drawPath 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-logo-glow {
          transform-origin: center;
          animation: pulseGlow 2.5s ease-in-out infinite;
          animation-delay: 1.8s;
        }
      `}</style>

      <div className="flex flex-col items-center max-w-xs px-6 text-center space-y-6">
        
        {/* Glow backdrop behind SVG logo */}
        <div className="relative flex items-center justify-center h-28 w-28">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />
          
          {/* Logo SVG rendering the actual glowing lines */}
          <svg
            viewBox="0 0 100 100"
            className="w-24 h-24 text-cyan-400 z-10 animate-logo-glow"
          >
            {/* Left B path */}
            <path
              d="M 32 26 L 32 78 M 32 26 C 46 26 46 54 32 54 C 18 54 18 78 32 78"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-logo-draw"
            />
            {/* Right B path */}
            <path
              d="M 52 26 L 52 78 M 52 26 C 66 26 66 54 52 54 C 66 54 66 78 52 78"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-logo-draw"
            />
          </svg>
        </div>

        {/* Branding text */}
        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-tight text-white/90">
            BudgetBuddy
          </h1>
          <p className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-widest leading-none">
            Student Financial Hub
          </p>
        </div>

        {/* Linear progress bar - Clean & Minimalist */}
        <div className="w-44 space-y-1.5 pt-2">
          <div className="h-0.5 w-full bg-slate-900/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-200 shadow-[0_0_6px_#22d3ee]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold px-0.5">
            <span className="truncate max-w-[110px]">
              {statusText}
            </span>
            <span className="tabular-nums text-cyan-400/70">{progress}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};
