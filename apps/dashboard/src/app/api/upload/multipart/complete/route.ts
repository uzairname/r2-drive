import { withAdminAPIProtection } from '@/lib/api-middleware'
import { getR2Url } from '@/lib/r2-utils';
import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AwsClient } from 'aws4fetch';

async function _POST(request: NextRequest) {
  try {
      const { key, uploadId, parts } = await request.json() as {
      key: string;
      uploadId: string;
      parts: {
        partNumber: number;
        etag: string;
      }[];
    };

    if (!key || !uploadId || !parts) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { env } = getCloudflareContext()

    const completeUploadUrl = `${getR2Url(key, env)}?uploadId=${uploadId}`;

    // Construct the XML body for the CompleteMultipartUpload request.
    const xmlBody = `
      <CompleteMultipartUpload xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        ${parts.map(p => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`).join('')}
      </CompleteMultipartUpload>
    `.trim();


    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    });

    // Sign and send the request to R2.
    const completeRequest = await r2.sign(completeUploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-MD5': btoa(String.fromCharCode(...new TextEncoder().encode(xmlBody)))
      },
      body: xmlBody,
    });
    
    const completeResponse = await fetch(completeRequest);

    if (!completeResponse.ok) {
        const errorBody = await completeResponse.text();
        console.error('Failed to complete multipart upload:', errorBody);
        return NextResponse.json(
            { error: 'Failed to complete R2 upload', details: errorBody }, 
            { status: completeResponse.status }
        );
    }

    return NextResponse.json({ success: true });
    

    // The S3 API requires parts to be sorted by their part number.
    parts.sort((a, b) => a.partNumber - b.partNumber);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error completing upload:', error);
    return NextResponse.json(
        { error: 'Failed to complete upload', details: errorMessage }, 
        { status: 500 }
    );
  }
}

export const POST = withAdminAPIProtection(_POST)