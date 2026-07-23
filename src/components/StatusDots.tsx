import React from 'react';
import { useStatusDots } from '../hooks/useStatusDots';

export const StatusDots: React.FC = () => {
  const {
    showStatusDots,
    activeTakenLoansCount,
    unpaidBillsCount,
    advancedPaidBillsCount,
    budgetUsedPercent
  } = useStatusDots();

  const totalDots = 40;

  if (!showStatusDots) return null;

  let loanDots = activeTakenLoansCount;
  let billDots = unpaidBillsCount;
  let advBillDots = advancedPaidBillsCount;

  // Cap if we have too many overlays to ensure at least 2 dots always represent the budget progress
  const maxOverlays = totalDots - 2;
  const totalOverlays = loanDots + billDots + advBillDots;
  if (totalOverlays > maxOverlays) {
    const scale = maxOverlays / totalOverlays;
    loanDots = Math.floor(loanDots * scale);
    billDots = Math.floor(billDots * scale);
    advBillDots = Math.floor(advBillDots * scale);
  }

  const dots = [];
  const radius = 43; // Relative to viewBox 0 0 100 100
  const centerX = 50;
  const centerY = 50;

  // Dynamic dot radius calculations to prevent overlapping at higher densities
  const dotRadius = Math.max(0.8, Math.min(3.0, 75 / totalDots));

  for (let i = 0; i < totalDots; i++) {
    const angle = (2 * Math.PI * i) / totalDots;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    let fill = '#34d399'; // default safe (emerald-400)
    let title = 'Budget: Safe';
    
    if (i < loanDots) {
      fill = '#fbbf24'; // Loan color (amber-400)
      title = `Loan Outstanding (${activeTakenLoansCount} total)`;
    } else if (i < loanDots + billDots) {
      fill = '#fb7185'; // Unpaid bill color (rose-400)
      title = `Unpaid Past Bill (${unpaidBillsCount} total)`;
    } else if (i < loanDots + billDots + advBillDots) {
      fill = '#818cf8'; // Advanced paid bill color (indigo-400)
      title = `Advanced Paid Bill (${advancedPaidBillsCount} total)`;
    } else {
      // Budget progress color
      if (budgetUsedPercent < 75) {
        fill = '#34d399';
        title = `Budget Progress: Safe (${budgetUsedPercent.toFixed(0)}% used)`;
      } else if (budgetUsedPercent < 100) {
        fill = '#fbbf24';
        title = `Budget Progress: Near Limit (${budgetUsedPercent.toFixed(0)}% used)`;
      } else {
        fill = '#fb7185';
        title = `Budget Progress: Exceeded (${budgetUsedPercent.toFixed(0)}% used)`;
      }
    }

    dots.push(
      <g key={i}>
        <title>{title}</title>
        <circle
          cx={x}
          cy={y}
          r={dotRadius}
          fill={fill}
          className="transition-colors duration-300"
        />
      </g>
    );
  }

  return (
    <svg 
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full rotate-[-90deg] transition-transform duration-700 ease-out group-hover:rotate-[270deg]"
    >
      {dots}
    </svg>
  );
};
