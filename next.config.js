/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  output: 'export',
  basePath: '/Bet_Website',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: '/Bet_Website',
  },
  // utile per static hosting e per evitare 404 su cartelle
  trailingSlash: true,
};
module.exports = nextConfig;
