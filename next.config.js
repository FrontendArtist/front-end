// path: front-end/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dl.tarhelahi.ir' },
      { protocol: 'https', hostname: 'api.tarhelahi.ir' },
      { protocol: 'https', hostname: 'tarhelahi.ir' },
    ],
  },
};

module.exports = nextConfig;