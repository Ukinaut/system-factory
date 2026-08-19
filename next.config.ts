import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.239", "192.168.1.239:3000", "192.168.1.239:3001", "localhost:3001", "169.254.83.107", "169.254.83.107:3000", "169.254.83.107:3001"],
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.1.239:3000", "localhost:3000", "192.168.1.239:3001", "localhost:3001", "169.254.83.107:3000", "169.254.83.107:3001"],
    },
  },
};

export default nextConfig;
