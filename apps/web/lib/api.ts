import { GraspClient } from "@grasp/api-client";

const backendUrl =
  process.env.GRASP_API_URL ||
  process.env.NEXT_PUBLIC_GRASP_API_URL ||
  "http://localhost:4000";

const devToken = process.env.NEXT_PUBLIC_GRASP_API_TOKEN || undefined;

export async function getServerClient(): Promise<GraspClient> {
  if (process.env.AUTH_GOOGLE_ID) {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const token = session?.graspAccessToken;
    return new GraspClient({ baseUrl: backendUrl, token });
  }

  return new GraspClient({ baseUrl: backendUrl, token: devToken });
}

export function createClient(token?: string): GraspClient {
  const baseUrl = process.env.NEXT_PUBLIC_GRASP_API_URL || "http://localhost:4000";
  return new GraspClient({ baseUrl, token });
}
