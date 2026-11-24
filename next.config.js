// path: front-end/next.config.js
const { buildContentSecurityPolicy } = require('./src/config/contentSecurityPolicy');

const isDev = process.env.NODE_ENV !== 'production';

const devRemotePatterns = [
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
    hostname: 'picsum.photos',
    pathname: '/**',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.1.101', 'localhost', '127.0.0.1'],
  images: {
    unoptimized: isDev,
    remotePatterns: [
      ...(isDev ? devRemotePatterns : []),
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
    ],
  },
  // CSP ایستا (BND-08) + هدرهای امنیتی پایه (M17).
  async headers() {
    const headerName = process.env.CSP_REPORT_ONLY === 'true'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    const securityHeaders = [
      { key: headerName, value: buildContentSecurityPolicy(process.env) },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
    ];
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
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