/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // در حالت dev، بهینه‌سازی را غیرفعال کن تا به IP لوکال گیر ندهد
        unoptimized: process.env.NODE_ENV === 'development', 
        
        remotePatterns: [
            {
                protocol: "http",
                hostname: "127.0.0.1",
                port: "1337",
                pathname: "/uploads/**",
            },
            {
                protocol: "http",
                hostname: "localhost",
                port: "1337",
                pathname: "/uploads/**",
            },
            {
                protocol: "https",
                hostname: "picsum.photos",
            }
        ],
    },
};

export default nextConfig;