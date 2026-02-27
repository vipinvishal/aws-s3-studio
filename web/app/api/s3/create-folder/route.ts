import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

    let folderKey = key.trim();
    if (!folderKey.endsWith("/")) folderKey += "/";

    const client = new S3Client({
      region: (region || process.env.AWS_REGION || "us-east-1").trim(),
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket.trim(),
        Key: folderKey,
        ContentLength: 0,
      })
    );

    return NextResponse.json({ success: true, key: folderKey });
  } catch (err) {
    console.error("Create folder error:", err);
    const message = err instanceof Error ? err.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
