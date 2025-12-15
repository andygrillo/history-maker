import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable cacheComponents to allow dynamic routes to work properly
  // This can be re-enabled once static params are properly configured
};

export default nextConfig;
