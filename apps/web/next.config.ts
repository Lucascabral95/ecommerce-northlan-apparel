import { resolve } from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'images.unsplash.com',
        protocol: 'https',
      },
      {
        hostname: 'placehold.co',
        protocol: 'https',
      },
    ],
  },
  output: 'standalone',
  outputFileTracingRoot: resolve(process.cwd(), '../..'),
  typedRoutes: true,
};

export default nextConfig;
