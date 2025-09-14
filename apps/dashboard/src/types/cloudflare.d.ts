// Import CloudflareEnv type from generated file

// Update Cloudflare environment with R2_STORAGE binding
declare module "../cloudflare-env" {
  interface CloudflareEnv {
    // Add R2 binding
    R2_STORAGE: R2Bucket;
    
    // Add environment variables
    ENABLE_AUTH: string;
    ALLOWED_ORIGINS: string;
  }
}

export {};