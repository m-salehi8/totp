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
  size = 38,
  strokeWidth = 3.5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / period));
  const strokeDashoffset = circumference * (1 - progress);

  // Dynamic color alert as time runs down (Crimson -> Amber -> Dark Red)
  let ringColor = 'stroke-[#5a1414]';
  let textColor = 'text-[#5a1414]';

  if (remainingSeconds <= 5) {
    ringColor = 'stroke-[#d24a3a] animate-pulse';
    textColor = 'text-[#d24a3a]';
  } else if (remainingSeconds <= 10) {
    ringColor = 'stroke-amber-600';
    textColor = 'text-amber-700';
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
      <span className={`absolute font-mono text-[11px] font-bold tabular-nums ${textColor}`}>
        {Math.ceil(remainingSeconds)}
      </span>
    </div>
  );
};
