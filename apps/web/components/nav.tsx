"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const topLinks = [
  { href: "/", label: "Courses" },
  { href: "/progress", label: "Progress" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

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

      <div className="ml-auto flex items-center gap-4">
        {session?.user && (
          <>
            <div className="flex items-center gap-2">
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-zinc-400">
                {session.user.name || session.user.email}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
