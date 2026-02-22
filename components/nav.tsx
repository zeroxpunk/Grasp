"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const topLinks = [
  { href: "/", label: "Courses" },
  { href: "/progress", label: "Progress" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-8 w-full">
      <Link href="/" className="text-sm font-medium text-zinc-100 tracking-tight">
        Learning
      </Link>
      {topLinks.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-sm transition-colors",
              active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
