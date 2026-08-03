import type { NextConfig } from "next";
import type { Configuration as WebpackConfiguration } from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@arise/domain"],
  webpack: (config: WebpackConfiguration): WebpackConfiguration => {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
