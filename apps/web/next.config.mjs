/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@myheritage/ui", "@myheritage/tokens", "@myheritage/contracts"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
