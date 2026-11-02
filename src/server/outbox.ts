import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";

/**
 * WhatsApp and SMS are mocked: messages land in `outbox_messages` instead of being sent.
 * Order updates are transactional; anything promotional needs the customer's opt-in (DPDP Act 2023).
 */
export type OutboxMessage = {
  channel: "whatsapp" | "sms";
  toPhone: string;
  purpose: "transactional" | "marketing";
  template: string;
  body: string;
  orderId?: string;
  customerId?: string;
};

export function canSend(purpose: OutboxMessage["purpose"], marketingOptIn: boolean): boolean {
  return purpose === "transactional" || marketingOptIn;
}

/** "+919000000001" → "+91 9XXXX XX001", for any screen that lists messages. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return "+91 XXXXX XXXXX";
  return `+91 ${digits[0]}XXXX XX${digits.slice(7)}`;
}

export async function enqueueMessage(
  client: SupabaseClient<Database>,
  msg: OutboxMessage,
): Promise<{ queued: boolean; reason?: "no_opt_in" }> {
  if (msg.purpose === "marketing") {
    const { data } = msg.customerId
      ? await client.from("profiles").select("marketing_opt_in").eq("id", msg.customerId).maybeSingle()
      : { data: null };
    if (!canSend("marketing", data?.marketing_opt_in ?? false)) return { queued: false, reason: "no_opt_in" };
  }
  const { error } = await client.from("outbox_messages").insert({
    channel: msg.channel,
    to_phone: msg.toPhone,
    purpose: msg.purpose,
    template: msg.template,
    body: msg.body,
    order_id: msg.orderId ?? null,
  });
  if (error) throw new Error(`outbox insert failed: ${error.message}`);
  return { queued: true };
}
