
export function getR2Url(key: string, env: CloudflareEnv): string {
  const baseUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return `${baseUrl}/${env.R2_BUCKET_NAME}/${key}`;
}
