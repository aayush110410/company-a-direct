import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "border border-seam text-fg hover:border-muted hover:bg-raised",
  ghost: "text-fg hover:bg-raised",
  danger: "border border-danger/60 text-danger hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[0.9375rem] gap-2 rounded-lg",
  lg: "h-13 px-6 text-base gap-2.5 rounded-xl",
  // Kitchen: a gloved thumb from arm's length.
  xl: "h-16 px-7 text-[1.125rem] gap-3 rounded-xl",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-semibold tracking-[-0.005em] select-none",
    "transition-[background-color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: { variant?: Variant; size?: Size; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
    >
      {loading && <LoaderCircle className="size-[1.1em] animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
