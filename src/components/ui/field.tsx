import { type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-seam bg-surface px-3.5 py-3 text-fg placeholder:text-muted/80 transition-colors duration-150 hover:border-muted focus:border-accent focus:outline-none aria-[invalid=true]:border-danger";

type FieldProps = { label: string; hint?: ReactNode; error?: string; className?: string };

export function Field({ label, hint, error, className, ...input }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={`${id}-note`} className={control} {...input} />
      <FieldNote id={`${id}-note`} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({ label, hint, error, className, ...input }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={`${id}-note`} className={cn(control, "min-h-24 resize-y")} {...input} />
      <FieldNote id={`${id}-note`} hint={hint} error={error} />
    </div>
  );
}

function FieldNote({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  if (!hint && !error) return null;
  return (
    <p id={id} className={cn("text-sm", error ? "text-danger" : "text-muted")} role={error ? "alert" : undefined}>
      {error ?? hint}
    </p>
  );
}
