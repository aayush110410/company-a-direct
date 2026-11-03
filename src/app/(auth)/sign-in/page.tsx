import { connection } from "next/server";
import { DemoAccounts } from "@/components/auth/demo-accounts";
import { SignInForm } from "@/components/auth/sign-in-form";
import { serverEnv } from "@/server/env";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  await connection();
  const { next: rawNext } = await searchParams;
  const next = typeof rawNext === "string" ? rawNext : undefined;
  return (
    <>
      <h1 className="font-display text-4xl leading-tight tracking-[-0.015em]">Welcome back</h1>
      <p className="mt-2 mb-8 text-muted">Sign in to order, or to open your kitchen screen.</p>
      <SignInForm next={next} />
      {serverEnv().DEMO_MODE && <DemoAccounts next={next} />}
    </>
  );
}
