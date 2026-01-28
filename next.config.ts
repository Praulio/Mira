import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb', // 50MB archivo + overhead base64 (~37%)
    },
  },
};

export default nextConfig;
