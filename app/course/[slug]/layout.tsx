"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

const courseLinks = [
  { suffix: "", label: "Lessons" },
  { suffix: "/progress", label: "Progress" },
  { suffix: "/insights", label: "Insights" },
];

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const slug = params.slug as string;
  const base = `/course/${slug}`;

  const isLessonPage = /^\/course\/[^/]+\/\d+/.test(pathname);
  if (isLessonPage) return <>{children}</>;

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 mt-8">
        <div className="flex gap-6 border-b border-zinc-800/50 pb-3">
          {courseLinks.map(({ suffix, label }) => {
            const href = base + suffix;
            const active = suffix === ""
              ? pathname === base
              : pathname.startsWith(href);
            return (
              <Link
                key={suffix}
                href={href}
                className={cn(
                  "text-sm transition-colors pb-1",
                  active
                    ? "text-zinc-100 border-b border-zinc-400"
                    : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
