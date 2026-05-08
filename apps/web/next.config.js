/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@voltwise/erse-client", "@voltwise/invoice-parser"],
  experimental: { typedRoutes: true },
};
module.exports = nextConfig;
