import React from 'react';

interface CountdownRingProps {
  remainingSeconds: number;
  period: number;
  size?: number;
  strokeWidth?: number;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  remainingSeconds,
  period,
  size = 36,
  strokeWidth = 3.5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / period));
  const strokeDashoffset = circumference * (1 - progress);

  // Dynamic color alert as time runs down
  let ringColor = 'stroke-[#5a1414] text-[#7b6464]';
  if (remainingSeconds <= 5) {
    ringColor = 'stroke-[#d24a3a] text-[#d24a3a] animate-pulse';
  } else if (remainingSeconds <= 10) {
    ringColor = 'stroke-amber-600 text-amber-700';
  }

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-label={`${Math.ceil(remainingSeconds)} seconds remaining`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[#efdcdc]"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated active circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`transition-[stroke-dashoffset] duration-150 ease-linear ${ringColor}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span
        className={`absolute font-mono text-xs font-bold tabular-nums ${
          remainingSeconds <= 5 ? 'text-[#d24a3a]' : 'text-[#7b6464]'
        }`}
      >
        {Math.ceil(remainingSeconds)}
      </span>
    </div>
  );
};
