import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.2.175",
    "192.168.2.175:2004",
    "192.168.2.239",
    "192.168.2.239:2004",
    "localhost",
    "localhost:2004",
    "127.0.0.1",
    "127.0.0.1:2004",
    "*.trycloudflare.com",
    "trycloudflare.com",
    "aitue-sistema.duckdns.org",
    "*.duckdns.org"
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "192.168.2.175:2004",
        "192.168.2.175",
        "192.168.2.239:2004",
        "192.168.2.239",
        "localhost:2004",
        "localhost",
        "127.0.0.1:2004",
        "127.0.0.1",
        "*.trycloudflare.com",
        "trycloudflare.com",
        "aitue-sistema.duckdns.org",
        "*.duckdns.org"
      ],
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
