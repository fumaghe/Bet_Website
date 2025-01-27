/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  /* output: 'export',*/
  basePath: '/Bet_Website',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: '/Bet_Website',
  },
};

module.exports = nextConfig;
