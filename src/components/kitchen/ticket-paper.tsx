import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BandTone = "steel" | "risk" | "late";

const BAND: Record<BandTone, string> = {
  steel: "bg-[#34312b] text-paper",
  risk: "bg-risk text-ink",
  late: "bg-late text-white",
};

/**
 * One paper ticket: the object kitchens already use, shared by the kitchen board and the
 * customer's status page so both literally show the same thing. Hangs from the rail by its clip.
 */
export function TicketPaper({
  number,
  status,
  tone = "steel",
  children,
  dropped = false,
  muted = false,
  size = "kitchen",
  className,
  label,
  clip = true,
}: {
  number: string;
  status: ReactNode;
  tone?: BandTone;
  children?: ReactNode;
  dropped?: boolean;
  muted?: boolean;
  size?: "kitchen" | "customer";
  className?: string;
  label: string;
  /** Only the ticket touching the rail gets a clip; others hang under it or stand alone. */
  clip?: boolean;
}) {
  return (
    <article
      aria-label={label}
      className={cn(
        "relative rounded-b-[var(--radius-ticket)] bg-paper text-ink shadow-[0_22px_40px_-22px_rgba(0,0,0,0.9)]",
        dropped && "motion-safe:animate-ticket-drop",
        muted && "opacity-75",
        className,
      )}
    >
      {/* The clip that holds the ticket on the rail. */}
      {clip && <span aria-hidden className="absolute -top-3 left-1/2 h-4 w-12 -translate-x-1/2 rounded-b-md bg-[#5b574e]" />}
      {/* Number on its own line so neither it nor the status ever wraps mid-phrase on a narrow column. */}
      <header className={cn("flex flex-col gap-1 px-4", size === "kitchen" ? "py-3" : "py-2.5", BAND[tone])}>
        <span className={cn("leading-none font-bold tracking-[-0.02em] tabular-nums", size === "kitchen" ? "text-[2.25rem]" : "text-2xl")}>{number}</span>
        <span className={cn("leading-tight font-semibold", size === "kitchen" ? "text-[1.25rem]" : "text-sm")}>{status}</span>
      </header>
      {children}
    </article>
  );
}

/** A ticket on the rail seen from the customer's side: anonymous for others, highlighted for theirs. */
export function MiniTicket({ number, mine = false, dropped = false }: { number?: string; mine?: boolean; dropped?: boolean }) {
  return (
    <span
      aria-hidden={!mine}
      className={cn(
        "relative block h-14 w-11 shrink-0 rounded-b-[var(--radius-ticket)]",
        mine ? "bg-paper ring-2 ring-accent" : "bg-paper/30",
        dropped && "motion-safe:animate-ticket-drop",
      )}
    >
      <span className={cn("absolute -top-2 left-1/2 h-3 w-5 -translate-x-1/2 rounded-b", mine ? "bg-accent" : "bg-[#5b574e]/70")} />
      <span className={cn("block h-5", mine ? "bg-[#34312b]" : "bg-[#34312b]/60")} />
      {mine && number && <span className="block pt-1 text-center text-xs font-bold text-ink tabular-nums">{number.slice(-3)}</span>}
    </span>
  );
}
