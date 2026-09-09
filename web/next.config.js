/** @type {import('next').NextConfig} */
const apiProxyUrl = process.env.API_PROXY_URL || "http://localhost:8000";

const nextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*/",
        destination: `${apiProxyUrl}/api/v1/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyUrl}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "**.openfoodfacts.org" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

module.exports = nextConfig;
