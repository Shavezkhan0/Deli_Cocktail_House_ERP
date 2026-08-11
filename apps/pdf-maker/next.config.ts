import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "puppeteer-core"],
};

export default nextConfig;
