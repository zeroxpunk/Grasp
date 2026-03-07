"use client";

import { SessionProvider } from "next-auth/react";
import { GraspClientProvider } from "@/lib/grasp-client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GraspClientProvider>{children}</GraspClientProvider>
    </SessionProvider>
  );
}
