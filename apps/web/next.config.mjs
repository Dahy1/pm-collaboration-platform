/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexus/ui", "@nexus/utils", "@nexus/types", "@nexus/config"],
};

export default nextConfig;
