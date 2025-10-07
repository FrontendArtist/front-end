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
        ],
    },
};

export default nextConfig;
