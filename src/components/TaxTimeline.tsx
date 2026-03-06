"use client";

import { useMemo } from "react";
import { Calendar, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TaxTimelineProps {
  filingEndDate: string;
}

export function TaxTimeline({ filingEndDate }: TaxTimelineProps) {
  const status = useMemo(() => {
    const now = new Date();
    const deadline = new Date(filingEndDate);
    const diffMs = deadline.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return {
        color: "red",
        icon: AlertTriangle,
        label: "Filing Closed",
        message: "Deadline has passed",
        urgency: "critical",
      };
    } else if (daysLeft <= 7) {
      return {
        color: "red",
        icon: AlertTriangle,
        label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
        message: "FILE NOW - Deadline approaching!",
        urgency: "critical",
      };
    } else if (daysLeft <= 30) {
      return {
        color: "yellow",
        icon: Clock,
        label: `${daysLeft} days left`,
        message: "Deadline approaching soon",
        urgency: "warning",
      };
    } else {
      const dateStr = deadline.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return {
        color: "green",
        icon: Calendar,
        label: `Due ${dateStr}`,
        message: "You have time to prepare",
        urgency: "normal",
      };
    }
  }, [filingEndDate]);

  const Icon = status.icon;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border
        ${
          status.urgency === "critical"
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            : status.urgency === "warning"
              ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
              : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        }
      `}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          status.urgency === "critical"
            ? "text-red-600 dark:text-red-400"
            : status.urgency === "warning"
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-green-600 dark:text-green-400"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            status.urgency === "critical"
              ? "text-red-900 dark:text-red-100"
              : status.urgency === "warning"
                ? "text-yellow-900 dark:text-yellow-100"
                : "text-green-900 dark:text-green-100"
          }`}
        >
          {status.message}
        </p>
        <p
          className={`text-xs ${
            status.urgency === "critical"
              ? "text-red-700 dark:text-red-300"
              : status.urgency === "warning"
                ? "text-yellow-700 dark:text-yellow-300"
                : "text-green-700 dark:text-green-300"
          }`}
        >
          {status.label}
        </p>
      </div>
      {status.urgency === "critical" && (
        <Badge variant="destructive" className="shrink-0 text-xs animate-pulse">
          URGENT
        </Badge>
      )}
    </div>
  );
}
