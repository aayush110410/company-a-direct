import { MessageSquareText, Smartphone } from "lucide-react";
import { connection } from "next/server";
import { Badge, EmptyState } from "@/components/ui";
import { formatIstTime } from "@/domain/time";
import { listOutbox } from "@/server/repo/admin";

export const metadata = { title: "Messages" };

export default async function OutboxPage() {
  await connection();
  const messages = await listOutbox();
  return (
    <main>
      <h1 className="font-display text-4xl">Messages</h1>
      <p className="mt-1 max-w-[70ch] text-muted">
        WhatsApp and SMS are mocked in this build: every message the system would send appears here instead. Order updates are transactional; offers
        only go to customers who opted in. Numbers are masked.
      </p>
      {messages.length === 0 ? (
        <EmptyState title="No messages yet" body="Place an order or let one run late, and its updates will show up here." />
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-seam rounded-xl border border-seam bg-raised">
          {messages.map((m) => (
            <li key={m.id} className="flex gap-4 px-4 py-3">
              <span className="mt-1 text-muted">
                {m.channel === "whatsapp" ? <MessageSquareText className="size-4" aria-label="WhatsApp" /> : <Smartphone className="size-4" aria-label="SMS" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="font-medium text-fg tabular-nums">{m.toMasked}</span>
                  <Badge tone={m.purpose === "marketing" ? "accent" : "neutral"}>{m.purpose}</Badge>
                  <span>{m.template.replace(/_/g, " ")}</span>
                  {m.order_id && <span className="tabular-nums">· {m.order_id}</span>}
                  <span className="ml-auto tabular-nums">{formatIstTime(new Date(m.created_at))}</span>
                </p>
                <p className="mt-1">{m.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
