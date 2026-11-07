// path: front-end/next.config.js
const { buildContentSecurityPolicy } = require('./src/config/contentSecurityPolicy');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.101', 'localhost', '127.0.0.1'],
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '1337',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dl.tarhelahi.ir',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.tarhelahi.ir',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.tarhelahi.ir',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.liara.site',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },
  // CSP ایستا (BND-08). در staging با CSP_REPORT_ONLY=true فقط گزارش می‌شود تا نقض‌ها پیش از اجبار پیدا شوند.
  async headers() {
    const headerName = process.env.CSP_REPORT_ONLY === 'true'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    return [
      {
        source: '/:path*',
        headers: [{ key: headerName, value: buildContentSecurityPolicy(process.env) }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/about-us',
        destination: '/about',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;