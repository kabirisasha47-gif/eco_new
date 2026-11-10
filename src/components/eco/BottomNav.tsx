import { Link, type LinkProps } from "@tanstack/react-router";
import { ChartNoAxesColumnIncreasing, FileText, House, Sun, User } from "lucide-react";

import { cn } from "@/lib/utils";

type Item = { to: NonNullable<LinkProps["to"]>; label: string; icon: typeof House; filled?: boolean };

const ITEMS: Item[] = [
  { to: "/dashboard", label: "خانه", icon: House, filled: true },
  { to: "/design", label: "طرح نیروگاه", icon: Sun },
  { to: "/case", label: "پرونده", icon: FileText },
  { to: "/income", label: "درآمد", icon: ChartNoAxesColumnIncreasing },
  { to: "/profile", label: "پروفایل", icon: User, filled: true },
];

export function BottomNav({ active }: { active: "/dashboard" | "/design" | "/case" | "/income" | "/profile" }) {
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="sticky bottom-4 z-20 mx-auto mt-6 flex w-fit items-center gap-1 rounded-full bg-sun-strong p-2"
    >
      {ITEMS.map((it) => {
        const isActive = it.to === active;
        return (
          <Link
            key={it.label}
            to={it.to}
            aria-label={it.label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "grid size-14 place-items-center rounded-full text-foreground transition",
              isActive ? "bg-card shadow-soft" : "hover:bg-sun-deep/40",
            )}
          >
            <it.icon className="size-5" fill={it.filled ? "currentColor" : "none"} strokeWidth={2.2} />
          </Link>
        );
      })}
    </nav>
  );
}
