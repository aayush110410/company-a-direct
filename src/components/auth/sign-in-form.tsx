"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/(auth)/actions";
import { Button, Field } from "@/components/ui";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const err = (f: string) => (state && !state.ok && state.field === f ? state.error : undefined);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={err("email")} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={err("password")} />
      {state && !state.ok && !state.field && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
      </Button>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="text-fg underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
