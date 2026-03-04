"use client";

import { cn } from "@/lib/utils";

interface CircularMeterProps {
  /** 0–100 */
  percentage: number;
  /** Display label in the centre (e.g. "RM 2,400") */
  centerLabel: string;
  /** Sub-label (e.g. "Tax Payable") */
  centerSub?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** When true the arc is green (paid/settled), otherwise amber→red gradient zone */
  settled?: boolean;
}

export function CircularMeter({
  percentage,
  centerLabel,
  centerSub,
  size = 200,
  strokeWidth = 16,
  className,
  settled = false,
}: CircularMeterProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Scale centre text proportionally to circle size
  const labelCls =
    size <= 100
      ? "text-sm"
      : size <= 140
        ? "text-base"
        : size <= 170
          ? "text-lg"
          : "text-xl";
  const subCls = size <= 120 ? "text-[9px]" : "text-[10px]";
  // clamp 0–100
  const pct = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (pct / 100) * circumference;

  /**
   * MAPPING TO YOUR COLORS:
   * 1. savedPct === 0%   (Full Tax) -> Grey
   * 2. savedPct <= 10%  (Tax > 90%) -> Orange
   * 3. savedPct >= 50%  (Tax < 50%) -> Slightly Green
   * 4. savedPct >= 80%  (Tax < 20%) -> Quite Green
   * 5. savedPct >= 95%  (Tax < 5%)  -> Total Green
   */
  const arcColor =
    pct === 0
      ? "#9ca3af" // grey-400 (No savings yet)
      : pct < 10
        ? "#f97316" // orange-500 (Starting to save)
        : pct < 50
          ? "#a3e635" // lime-400 (Making progress)
          : pct < 80
            ? "#4ade80" // green-400 (Great optimization)
            : "#16a34a"; // green-600 (Maximum Zero-Tax status)

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/25 dark:text-muted-foreground/20"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease",
          }}
        />
      </svg>
      {/* Centre text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className={cn("font-bold leading-tight tabular-nums", labelCls)}>
          {centerLabel}
        </span>
        {centerSub && (
          <span className={cn("text-muted-foreground mt-0.5", subCls)}>
            {centerSub}
          </span>
        )}
      </div>
    </div>
  );
}
