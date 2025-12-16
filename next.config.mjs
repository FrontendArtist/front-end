/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "picsum.photos",
            },
            {
                protocol: "http",
                hostname: "localhost",
                port: "1337",
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '1337',
                pathname: '/uploads/**',
            }
        ],
        qualities: [50, 75, 90, 100],
    },
};

export default nextConfig;
