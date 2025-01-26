/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  basePath: '/Bet_Website', // Sostituisci con il nome del tuo repository
  assetPrefix: '/Bet_Website/', // Sostituisci con il nome del tuo repository
  output: 'export', // Necessario per l'esportazione statica
  trailingSlash: true, // Opzionale: aggiunge una barra finale a ogni URL
};

module.exports = nextConfig;
