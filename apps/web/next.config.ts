import type { NextConfig } from "next";
import { resolve } from "path";

const backendUrl = process.env.NEXT_PUBLIC_GRASP_API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
