/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Se usi immagini statiche e non vuoi ottimizzarle
  images: { unoptimized: true },

  output: 'export',
  basePath: '/Bet_Website',
  assetPrefix: '/Bet_Website/',
  trailingSlash: true,
};

module.exports = nextConfig;
