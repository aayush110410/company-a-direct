"use client";

import { ErrorState } from "@/components/ui";

export default function MenuError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-5 pt-28">
      <ErrorState
        title="We couldn't load this menu"
        body="The kitchen's menu didn't come through. Check your connection and try again."
        onRetry={reset}
      />
    </main>
  );
}
