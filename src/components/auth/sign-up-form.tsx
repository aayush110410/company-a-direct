"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/(auth)/actions";
import { Button, Field } from "@/components/ui";

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUp, null);
  const err = (f: string) => (state && !state.ok && state.field === f ? state.error : undefined);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Your name" name="fullName" autoComplete="name" required error={err("fullName")} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={err("email")} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={err("password")}
      />
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketingOptIn" className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
        <span>Send me offers on WhatsApp. Optional. Order updates come either way, and you can switch offers off anytime.</span>
      </label>
      {state && !state.ok && !state.field && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Create account
      </Button>
      <p className="text-sm text-muted">
        Already ordering with us?{" "}
        <Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"} className="text-fg underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
