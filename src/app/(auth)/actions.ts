"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_ACCOUNTS, type DemoKey } from "@/lib/demo-accounts";
import { type ActionFailure, fail } from "@/lib/result";
import { homeFor, safeNext } from "@/server/auth-rules";
import { serverEnv } from "@/server/env";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { createServerClient } from "@/server/supabase/server";

const signInSchema = z.object({
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

async function roleOf(userId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role ?? "customer";
}

export async function signIn(_prev: ActionFailure | null, formData: FormData): Promise<ActionFailure | null> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return fail(issue.message, String(issue.path[0]));
  }
  const { email, password, next } = parsed.data;

  const limit = rateLimit(`signin:${clientIp(await headers())}:${email}`, 5, 60_000);
  if (!limit.allowed) return fail(`Too many attempts. Try again in ${Math.ceil(limit.retryAfterMs / 1000)} seconds.`);

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail("That email and password don't match an account", "password");

  redirect(safeNext(next, await roleOf(data.user.id)));
}

export async function signInAsDemo(key: DemoKey, next?: string): Promise<ActionFailure | null> {
  const env = serverEnv();
  if (!env.DEMO_MODE) return fail("Demo accounts are switched off");
  const account = DEMO_ACCOUNTS[key];
  if (!account) return fail("Unknown demo account");

  const limit = rateLimit(`demo:${clientIp(await headers())}`, 20, 60_000);
  if (!limit.allowed) return fail("Too many demo sign-ins. Wait a minute and try again.");

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: env.DEMO_USER_PASSWORD });
  if (error) return fail("The demo accounts aren't set up yet. Run the seed (see deployment.md).");

  redirect(next ? safeNext(next, account.role) : homeFor(account.role));
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  marketingOptIn: z.literal("on").optional(),
  next: z.string().optional(),
});

export async function signUp(_prev: ActionFailure | null, formData: FormData): Promise<ActionFailure | null> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return fail(issue.message, String(issue.path[0]));
  }
  const { fullName, email, password, marketingOptIn, next } = parsed.data;

  const limit = rateLimit(`signup:${clientIp(await headers())}`, 5, 60_000);
  if (!limit.allowed) return fail("Too many sign-ups from this connection. Try again shortly.");

  const supabase = await createServerClient();
  // Only name and opt-in travel as metadata; the database always creates a customer profile.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, marketing_opt_in: marketingOptIn === "on" } },
  });
  if (error) {
    return error.code === "user_already_exists" || error.message.toLowerCase().includes("already")
      ? fail("An account with this email already exists. Sign in instead.", "email")
      : fail("We couldn't create your account. Try again in a moment.");
  }
  if (!data.session) return fail("Check your inbox to confirm your email, then sign in.");

  redirect(safeNext(next, "customer"));
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
