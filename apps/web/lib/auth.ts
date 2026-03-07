import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { GraspClient } from "@grasp/api-client";

const backendUrl =
  process.env.GRASP_API_URL ||
  process.env.NEXT_PUBLIC_GRASP_API_URL ||
  "http://localhost:4000";

declare module "next-auth" {
  interface Session {
    graspAccessToken?: string;
    graspUserId?: string;
  }
}

interface GraspJWTFields {
  graspAccessToken?: string;
  graspRefreshToken?: string;
  graspTokenExpiresAt?: number;
  graspUserId?: string;
}

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

const config: NextAuthConfig = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile }) {
      const t = token as Record<string, unknown> & GraspJWTFields;

      if (profile?.picture) {
        t.picture = profile.picture;
      }

      if (account?.provider === "google" && account.id_token) {
        try {
          const client = new GraspClient({ baseUrl: backendUrl });
          const session = await client.auth.verifyGoogle(
            account.id_token,
            "web"
          );
          t.graspAccessToken = session.token;
          t.graspRefreshToken = session.refreshToken;
          t.graspTokenExpiresAt = new Date(session.expiresAt).getTime();
          t.graspUserId = session.user.id;
        } catch (e) {
          console.error("Failed to verify Google token with backend:", e);
        }
        return t;
      }

      if (
        typeof t.graspTokenExpiresAt === "number" &&
        t.graspRefreshToken &&
        Date.now() > t.graspTokenExpiresAt - 60_000
      ) {
        try {
          const client = new GraspClient({ baseUrl: backendUrl });
          const session = await client.auth.refresh(
            t.graspRefreshToken,
            "web"
          );
          t.graspAccessToken = session.token;
          t.graspRefreshToken = session.refreshToken;
          t.graspTokenExpiresAt = new Date(session.expiresAt).getTime();
          t.graspUserId = session.user.id;
        } catch {
          t.graspAccessToken = undefined;
          t.graspRefreshToken = undefined;
          t.graspTokenExpiresAt = undefined;
        }
      }

      return t;
    },
    session({ session, token }) {
      const t = token as Record<string, unknown> & GraspJWTFields;
      session.graspAccessToken = t.graspAccessToken;
      session.graspUserId = t.graspUserId;
      if (session.user) {
        session.user.image = (t.picture as string) ?? session.user.image ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
