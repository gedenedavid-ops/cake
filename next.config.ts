import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output — requis pour Render (et compatible Vercel)
  output: 'standalone',

  // PWA headers + security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
