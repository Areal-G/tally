/**
 * Table body pulse rows — real column headers stay visible.
 * Use inside TableBody while data is loading; only cell values pulse.
 */

import React from "react";
import { TableBody, TableCell, TableRow } from "./table";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

export type TableBodyPulseRowsProps = {
  rows?: number;
  columnCount: number;
  /** Alternating row tint to match loaded tables */
  striped?: boolean;
  className?: string;
};

export function TableBodyPulseRows({
  rows = 8,
  columnCount,
  striped = true,
  className,
}: TableBodyPulseRowsProps) {
  return (
    <TableBody className={className}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow
          key={rowIndex}
          className={
            striped
              ? rowIndex % 2 === 0
                ? "bg-white/30 dark:bg-white/5"
                : "bg-white/20 dark:bg-white/10"
              : undefined
          }
        >
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell key={colIndex} className="p-4">
              <Skeleton className="h-4 w-full min-w-[60px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export type TableFrameProps = {
  children: React.ReactNode;
  className?: string;
};

/** Shared glass table frame used by list tables. */
export function TableFrame({ children, className }: TableFrameProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-violet-400/20 dark:border-white/10 bg-white/20 dark:bg-white/5 overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
