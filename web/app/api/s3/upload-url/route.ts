import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, region, accessKeyId, secretAccessKey, key } = body as {
      bucket: string;
      region?: string;
      accessKeyId: string;
      secretAccessKey: string;
      key: string;
    };

    if (!bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim() || !key?.trim()) {
      return NextResponse.json(
        { error: "Missing bucket, accessKeyId, secretAccessKey, or key" },
        { status: 400 }
      );
    }

    const client = new S3Client({
      region: (region || process.env.AWS_REGION || "us-east-1").trim(),
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket.trim(),
      Key: key.trim(),
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    return NextResponse.json({ uploadUrl });
  } catch (err) {
    console.error("Upload URL error:", err);
    const message = err instanceof Error ? err.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
