import { NextRequest, NextResponse } from "next/server";
import { R2Client } from "@/lib/r2-client";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, contentType } = body as { key: string; contentType?: string };
    
    if (!key || key.trim() === "") {
      console.error("Missing or empty key parameter in request body:", { key });
      return NextResponse.json({ error: "Missing or empty key parameter" }, { status: 400 });
    }

    const client = new R2Client(getCloudflareContext().env);
    
    // Create multipart upload using R2 binding
    const multipartUpload = await client.initiateMultipartUpload(key, {
      httpMetadata: {
        contentType: contentType || "application/octet-stream"
      }
    });

    return NextResponse.json({
      uploadId: multipartUpload.uploadId,
      key: multipartUpload.key
    });

  } catch (error) {
    console.error("Error initiating multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to initiate multipart upload" },
      { status: 500 }
    );
  }
}