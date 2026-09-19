/** @type {import('next').NextConfig} */
const apiProxyTarget = (process.env.API_PROXY_TARGET || "http://127.0.0.1:4000").replace(/\/$/, "");

const nextConfig = {
  output: "standalone",
  transpilePackages: ["@myheritage/ui", "@myheritage/tokens", "@myheritage/contracts"],
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: "/__api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
