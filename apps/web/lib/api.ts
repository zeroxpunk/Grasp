import { GraspClient } from "@grasp/api-client";

const baseUrl =
  process.env.NEXT_PUBLIC_GRASP_API_URL || "http://localhost:4000";
const token = process.env.NEXT_PUBLIC_GRASP_API_TOKEN || undefined;

let client: GraspClient | null = null;

export function getClient(): GraspClient {
  if (!client) {
    client = new GraspClient({ baseUrl, token });
  }
  return client;
}
