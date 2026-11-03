"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "./button";

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-seam bg-surface p-5">
      <p className="flex items-center gap-2 font-semibold">
        <TriangleAlert className="size-4 text-danger" aria-hidden />
        {title}
      </p>
      <p className="max-w-[52ch] text-muted">{body}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
