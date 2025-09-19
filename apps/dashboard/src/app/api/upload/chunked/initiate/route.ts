import { NextRequest, NextResponse } from "next/server";
import { withAdminAPIProtection } from "@/lib/api-middleware";
import { R2Client } from "@/lib/r2-client";

async function _POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, contentType, lastModified } = body as { 
      key: string; 
      contentType?: string; 
      lastModified?: number; 
    };
    
    if (!key || key.trim() === "") {
      console.error("Missing or empty key parameter in request body:", { key });
      return NextResponse.json({ error: "Missing or empty key parameter" }, { status: 400 });
    }

    const client = new R2Client();
    
    // Prepare custom metadata if lastModified is provided
    const customMetadata: Record<string, string> = {};
    if (lastModified) {
      customMetadata.originalLastModified = lastModified.toString();
    }
    
    // Create multipart upload using R2 binding
    const multipartUpload = await client.createMultipartUpload(key, {
      httpMetadata: {
        contentType: contentType || "application/octet-stream"
      },
      customMetadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined
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

export const POST = withAdminAPIProtection(_POST);