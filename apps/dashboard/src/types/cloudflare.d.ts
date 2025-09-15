// Import CloudflareEnv type from generated file

// Update Cloudflare environment with bindings
declare module "../cloudflare-env" {
  interface CloudflareEnv {
    // Add R2 binding
    FILES: R2Bucket;
    
    // Add environment variables
    ENABLE_AUTH: string;
    ALLOWED_ORIGINS: string;
  }
}

export {};