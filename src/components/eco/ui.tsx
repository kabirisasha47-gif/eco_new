import { Link, type LinkProps } from "@tanstack/react-router";
import { Bell, ChevronLeft, ChevronRight, Info, User } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { NotificationsSheet } from "./NotificationsSheet";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Screen({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}

export function TopArea({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("px-5 pt-5", className)}>{children}</section>;
}

/** The signature yellow panel that fills the lower part of every screen. */
export function SunPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn("mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-sun px-5 pb-8 pt-6", className)}
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function IconCircle({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const circleLinkClass =
  "relative grid size-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95";

export function BellButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconCircle aria-label="اعلان‌ها" onClick={() => setOpen(true)}>
        <Bell className="size-5" fill="currentColor" />
        <span className="absolute right-2.5 top-2 size-2 rounded-full bg-danger ring-2 ring-card" />
      </IconCircle>
      <NotificationsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

export function InkButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-14 flex-1 items-center justify-center rounded-full bg-ink px-6 text-base font-extrabold text-ink-foreground transition active:scale-[0.98] disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function WhiteButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-14 shrink-0 items-center justify-center rounded-full bg-card px-6 text-sm font-extrabold text-foreground transition active:scale-[0.98]",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: NonNullable<LinkProps["to"]>;
  start?: "back" | "user";
  end?: "bell" | ReactNode;
}

export function ScreenHeader({ title, subtitle, backTo, start = "back", end = "bell" }: ScreenHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      {start === "user" ? (
        <Link to="/profile" aria-label="پروفایل" className={circleLinkClass}>
          <User className="size-5" fill="currentColor" />
        </Link>
      ) : (
        <Link to={backTo ?? "/dashboard"} aria-label="بازگشت" className={circleLinkClass}>
          <ChevronRight className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-xl font-extrabold leading-8 text-foreground">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {end === "bell" ? <BellButton /> : end}
    </header>
  );
}

export function InfoCircleButton({ onClick, label = "توضیحات" }: { onClick: () => void; label?: string }) {
  return (
    <IconCircle aria-label={label} onClick={onClick}>
      <Info className="size-5" />
    </IconCircle>
  );
}

/* ------------------------------------------------------------------ */
/* Hero statistic                                                      */
/* ------------------------------------------------------------------ */

interface HeroStatProps {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  aside?: ReactNode;
}

export function HeroStat({ label, value, unit, aside }: HeroStatProps) {
  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="num text-[3.5rem] font-black leading-[1.05] text-foreground">{value}</span>
          {unit ? <span className="whitespace-nowrap text-sm text-muted-foreground">{unit}</span> : null}
        </div>
        {aside}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown pill                                                       */
/* ------------------------------------------------------------------ */

export function Caret({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 5" className={cn("size-2", className)} aria-hidden>
      <path d="M0 0h8L4 5z" fill="currentColor" />
    </svg>
  );
}

interface DropdownPillProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}

export function DropdownPill<T extends string>({ value, options, onChange, label }: DropdownPillProps<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger
        aria-label={label}
        className="mb-2 flex h-12 shrink-0 items-center gap-4 rounded-full bg-card px-5 text-base font-bold text-foreground shadow-soft outline-none"
      >
        <span>{current?.label}</span>
        <Caret />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36 rounded-2xl p-1.5 font-sans">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="rounded-xl py-2 text-sm">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Pills & badges                                                      */
/* ------------------------------------------------------------------ */

type PillTone = "sun" | "white" | "success" | "warn" | "danger" | "ink" | "muted";

const pillTones: Record<PillTone, string> = {
  sun: "bg-sun-soft text-foreground",
  white: "bg-card text-foreground",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  ink: "bg-ink text-ink-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function Pill({
  tone = "sun",
  children,
  className,
  size = "md",
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold",
        size === "md" ? "h-9 px-4 text-xs" : "h-6 px-2.5 text-[0.65rem]",
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Rows & cards                                                        */
/* ------------------------------------------------------------------ */

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-extrabold text-foreground">{children}</h2>
      {aside}
    </div>
  );
}

export function InfoRow({
  label,
  value,
  badge,
  last,
}: {
  label: ReactNode;
  value: ReactNode;
  badge?: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-3.5",
        !last && "border-b border-ink/10",
      )}
    >
      <span className="flex items-center gap-2 text-sm text-foreground/80">
        {label}
        {badge}
      </span>
      <span dir="auto" className="num text-sm font-extrabold text-foreground">{value}</span>
    </div>
  );
}

export function ActionCard({
  icon,
  title,
  subtitle,
  onClick,
  to,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  onClick?: () => void;
  to?: NonNullable<LinkProps["to"]>;
}) {
  const inner = (
    <>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sun-soft text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-base font-extrabold text-foreground">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      <ChevronLeft className="size-5 shrink-0 text-foreground" />
    </>
  );
  const cls =
    "mt-3 flex w-full items-center gap-3 rounded-[1.75rem] bg-card p-4 transition active:scale-[0.99]";
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function Footnote({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "mt-4 flex items-center justify-center gap-1.5 text-center text-[0.7rem] leading-5 text-foreground/70",
        className,
      )}
    >
      {icon}
      {children}
    </p>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors",
        checked ? "bg-ink" : "bg-track",
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-6 rounded-full bg-card shadow-soft transition-all",
          checked ? "left-1" : "left-7",
        )}
      />
    </button>
  );
}

export function SunMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="8" fill="currentColor" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 24 + Math.cos(a) * 13;
        const y1 = 24 + Math.sin(a) * 13;
        const x2 = 24 + Math.cos(a) * 19;
        const y2 = 24 + Math.sin(a) * 19;
        return (
          <line
            key={i}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
