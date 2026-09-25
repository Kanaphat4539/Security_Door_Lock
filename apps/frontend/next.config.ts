import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local `next start` needs a normal build; Docker uses the traced server.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
