import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
initOpenNextCloudflareForDev();


const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@workspace/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  }
};

export default nextConfig;
