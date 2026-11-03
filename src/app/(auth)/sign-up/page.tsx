import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl leading-tight tracking-[-0.015em]">Order direct</h1>
      <p className="mt-2 mb-8 text-muted">One account for every Company A outlet. We only ask for what an order needs.</p>
      <SignUpForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}
