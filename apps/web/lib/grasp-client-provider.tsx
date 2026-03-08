"use client";

import { createContext, useContext, useMemo } from "react";
import { getSession } from "next-auth/react";
import { GraspClient, type TokenProvider } from "@grasp/api-client";

const GraspClientContext = createContext<GraspClient | null>(null);
const devToken = process.env.NEXT_PUBLIC_GRASP_API_TOKEN || undefined;

function createSessionTokenProvider(initialToken?: string): TokenProvider {
  let cachedToken: string | undefined = initialToken;
  let pendingTokenLoad: Promise<string> | null = null;

  return async ({ forceRefresh } = {}) => {
    if (!forceRefresh && cachedToken !== undefined) {
      return cachedToken;
    }

    if (pendingTokenLoad) {
      return pendingTokenLoad;
    }

    pendingTokenLoad = getSession()
      .then((session) => {
        const nextToken = session?.graspAccessToken ?? devToken ?? "";
        cachedToken = nextToken;
        return nextToken;
      })
      .finally(() => {
        pendingTokenLoad = null;
      });

    return pendingTokenLoad;
  };
}

export function GraspClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_GRASP_API_URL || "http://localhost:4000";
    return new GraspClient({
      baseUrl,
      token: createSessionTokenProvider(devToken),
    });
  }, []);

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
