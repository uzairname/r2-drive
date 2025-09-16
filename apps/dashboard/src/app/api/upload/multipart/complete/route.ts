import { NextRequest, NextResponse } from "next/server";
import { R2Client } from "@/lib/r2-client";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withAdminAPIProtection } from "@/lib/api-middleware";

async function _POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId, key, parts } = body as { 
      uploadId: string; 
      key: string; 
      parts: Array<{ partNumber: number; etag: string }> 
    };
    
    if (!uploadId || !key || !parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { error: "Missing required parameters: uploadId, key, parts" }, 
        { status: 400 }
      );
    }

    // Validate parts array
    for (const part of parts) {
      if (!part.partNumber || !part.etag || typeof part.partNumber !== 'number') {
        return NextResponse.json(
          { error: "Invalid parts array format" }, 
          { status: 400 }
        );
      }
    }

    const client = new R2Client();
    // Complete the multipart upload
    const result = await client.completeMultipartUpload(uploadId, key, parts);

    return NextResponse.json({
      success: true,
      etag: result?.etag,
      key: key
    });

  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to complete multipart upload" },
      { status: 500 }
    );
  }
}

export const POST = withAdminAPIProtection(_POST);