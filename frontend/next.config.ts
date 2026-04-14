import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Hosting static export
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Environment variables for API requests
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://matching-site-backend-28972507403.asia-northeast1.run.app',
  },
};

export default nextConfig;
