import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aperture/ui", "@aperture/shared"],
};

export default nextConfig;
