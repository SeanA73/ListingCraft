import React from "react";

/** Circular score ring 0-100 with color grading. */
export default function ScoreRing({ score = 0, size = 128, stroke = 10, testId }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * clamped) / 100;

  let color = "#3E7B58"; // green
  if (clamped < 50) color = "#C95A41";
  else if (clamped < 80) color = "#D99036";

  return (
    <div className="relative inline-flex items-center justify-center" data-testid={testId}>
      <svg width={size} height={size} className="score-ring -rotate-90" style={{"--ring-offset": offset}}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#EBE6E0" strokeWidth={stroke} fill="none" />
        <circle
          className="progress"
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          style={{ strokeDasharray: c, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl text-ink leading-none">{clamped}</span>
        <span className="text-[10px] uppercase tracking-widest text-mutedink mt-1">Score</span>
      </div>
    </div>
  );
}
