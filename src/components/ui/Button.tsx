"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";
type Size = "lg" | "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentStrong focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-sm ring-1 ring-accentStrong hover:bg-accentStrong",
  secondary: "bg-surface text-foreground ring-1 ring-border hover:bg-surface2",
  success: "bg-success text-white shadow-sm ring-1 ring-success hover:brightness-[0.98]",
  danger: "bg-danger text-white shadow-sm ring-1 ring-danger hover:brightness-[0.98]",
  ghost: "bg-transparent text-foreground hover:bg-surface2",
};

const sizeClass: Record<Size, string> = {
  lg: "h-12 px-4 text-sm",
  md: "h-11 px-4 text-sm",
  sm: "h-10 px-3 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = "primary", size = "lg", type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={[base, sizeClass[size], variantClass[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});

Button.displayName = "Button";
