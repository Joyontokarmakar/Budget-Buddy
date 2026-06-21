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
      {/* Styles for pulsing glow animation */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% {
            filter: drop-shadow(0 4px 6px rgba(34, 211, 238, 0.25)) drop-shadow(0 10px 15px rgba(139, 92, 246, 0.2));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 8px 12px rgba(34, 211, 238, 0.4)) drop-shadow(0 16px 24px rgba(139, 92, 246, 0.35));
            transform: scale(1.03);
          }
        }
        .animate-logo-glow {
          transform-origin: center;
          animation: pulseGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col items-center max-w-xs px-6 text-center space-y-6">
        
        {/* Glow backdrop behind SVG logo card */}
        <div className="relative flex items-center justify-center h-28 w-28">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          
          {/* Logo SVG rendering the actual logo card with progressive vertical fill */}
          <div className="relative flex items-center justify-center h-28 w-28 z-10 animate-logo-glow">
            <svg
              viewBox="262 195 503 503"
              className="w-full h-full"
              fill="none"
            >
              <defs>
                <linearGradient id="loader-buddy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <clipPath id="loader-clip">
                  <rect
                    x="262"
                    y={195 + 503 * (1 - progress / 100)}
                    width="503"
                    height={503 * (progress / 100)}
                    style={{ transition: 'y 0.2s ease-out, height 0.2s ease-out' }}
                  />
                </clipPath>
              </defs>

              {/* Silhouette background (low opacity) */}
              <g opacity="0.15">
                <g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)" fill="url(#loader-buddy-grad)" stroke="none">
                  <path d="M3585 8290 c-201 -22 -378 -93 -542 -217 -185 -139 -322 -346 -390 -589 l-28 -99 0 -1595 0 -1595 26 -95 c86 -308 290 -560 564 -697 103 -52 221 -89 326 -103 59 -8 551 -10 1629 -8 l1545 3 99 27 c406 112 703 436 788 858 19 95 19 3112 0 3215 -81 439 -394 770 -831 878 -86 21 -90 21 -1601 23 -833 1 -1546 -2 -1585 -6z m1245 -1263 c30 -9 91 -34 135 -56 387 -192 486 -740 191 -1058 l-61 -65 80 -82 c92 -92 142 -178 176 -301 30 -112 24 -296 -14 -403 -67 -191 -212 -342 -397 -418 -127 -52 -163 -54 -807 -54 l-596 0 6 133 c12 242 71 509 155 705 99 229 242 396 413 482 127 65 167 73 399 80 187 6 223 10 272 29 80 31 157 104 194 183 26 57 29 73 29 168 0 95 -3 110 -28 160 -34 66 -86 122 -146 157 -81 49 -124 53 -562 53 l-406 0 -6 -107 c-4 -58 -7 -241 -7 -406 l0 -300 -63 -66 c-82 -85 -144 -174 -201 -286 l-45 -90 -1 783 0 783 618 -4 c540 -3 624 -5 672 -20z m1335 -1 c121 -36 205 -86 296 -176 70 -69 94 -101 128 -170 61 -127 74 -190 69 -340 -4 -96 -10 -141 -28 -194 -28 -81 -98 -192 -161 -256 l-44 -44 76 -76 c41 -41 89 -100 106 -130 180 -318 87 -727 -209 -923 -100 -65 -192 -103 -284 -117 -38 -5 -264 -10 -502 -10 l-433 0 61 50 c66 56 123 123 172 205 l32 54 320 3 c371 4 391 8 489 98 209 191 162 523 -91 643 l-67 32 -325 4 -325 3 -50 75 c-27 41 -54 80 -59 87 -5 7 8 36 35 79 l43 67 280 0 c316 0 385 8 469 52 94 51 153 135 178 256 16 75 3 166 -32 239 -33 68 -116 146 -186 174 -56 23 -70 24 -385 27 l-326 3 -39 67 c-21 37 -75 105 -120 152 -46 46 -83 86 -83 88 0 2 210 1 468 -1 411 -3 474 -5 527 -21z"/>
                  <path d="M4346 5669 c-213 -50 -392 -315 -459 -681 l-14 -77 41 -6 c22 -4 221 -5 441 -3 394 4 401 4 460 27 84 34 183 133 215 216 30 77 33 197 7 271 -40 115 -129 205 -242 244 -50 17 -82 20 -234 19 -97 -1 -193 -5 -215 -10z"/>
                </g>
              </g>

              {/* Clipped foreground fill (full opacity) */}
              <g clipPath="url(#loader-clip)">
                <g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)" fill="url(#loader-buddy-grad)" stroke="none">
                  <path d="M3585 8290 c-201 -22 -378 -93 -542 -217 -185 -139 -322 -346 -390 -589 l-28 -99 0 -1595 0 -1595 26 -95 c86 -308 290 -560 564 -697 103 -52 221 -89 326 -103 59 -8 551 -10 1629 -8 l1545 3 99 27 c406 112 703 436 788 858 19 95 19 3112 0 3215 -81 439 -394 770 -831 878 -86 21 -90 21 -1601 23 -833 1 -1546 -2 -1585 -6z m1245 -1263 c30 -9 91 -34 135 -56 387 -192 486 -740 191 -1058 l-61 -65 80 -82 c92 -92 142 -178 176 -301 30 -112 24 -296 -14 -403 -67 -191 -212 -342 -397 -418 -127 -52 -163 -54 -807 -54 l-596 0 6 133 c12 242 71 509 155 705 99 229 242 396 413 482 127 65 167 73 399 80 187 6 223 10 272 29 80 31 157 104 194 183 26 57 29 73 29 168 0 95 -3 110 -28 160 -34 66 -86 122 -146 157 -81 49 -124 53 -562 53 l-406 0 -6 -107 c-4 -58 -7 -241 -7 -406 l0 -300 -63 -66 c-82 -85 -144 -174 -201 -286 l-45 -90 -1 783 0 783 618 -4 c540 -3 624 -5 672 -20z m1335 -1 c121 -36 205 -86 296 -176 70 -69 94 -101 128 -170 61 -127 74 -190 69 -340 -4 -96 -10 -141 -28 -194 -28 -81 -98 -192 -161 -256 l-44 -44 76 -76 c41 -41 89 -100 106 -130 180 -318 87 -727 -209 -923 -100 -65 -192 -103 -284 -117 -38 -5 -264 -10 -502 -10 l-433 0 61 50 c66 56 123 123 172 205 l32 54 320 3 c371 4 391 8 489 98 209 191 162 523 -91 643 l-67 32 -325 4 -325 3 -50 75 c-27 41 -54 80 -59 87 -5 7 8 36 35 79 l43 67 280 0 c316 0 385 8 469 52 94 51 153 135 178 256 16 75 3 166 -32 239 -33 68 -116 146 -186 174 -56 23 -70 24 -385 27 l-326 3 -39 67 c-21 37 -75 105 -120 152 -46 46 -83 86 -83 88 0 2 210 1 468 -1 411 -3 474 -5 527 -21z"/>
                  <path d="M4346 5669 c-213 -50 -392 -315 -459 -681 l-14 -77 41 -6 c22 -4 221 -5 441 -3 394 4 401 4 460 27 84 34 183 133 215 216 30 77 33 197 7 271 -40 115 -129 205 -242 244 -50 17 -82 20 -234 19 -97 -1 -193 -5 -215 -10z"/>
                </g>
              </g>
            </svg>
          </div>
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
