"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { GraspClient } from "@grasp/api-client";

const GraspClientContext = createContext<GraspClient | null>(null);
const devToken = process.env.NEXT_PUBLIC_GRASP_API_TOKEN || undefined;

export function GraspClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  const client = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_GRASP_API_URL || "http://localhost:4000";
    const token = session?.graspAccessToken ?? devToken;
    return new GraspClient({ baseUrl, token });
  }, [session?.graspAccessToken]);

  return (
    <GraspClientContext.Provider value={client}>
      {children}
    </GraspClientContext.Provider>
  );
}

export function useGraspClient(): GraspClient {
  const client = useContext(GraspClientContext);
  if (!client) {
    throw new Error("useGraspClient must be used within GraspClientProvider");
  }
  return client;
}
