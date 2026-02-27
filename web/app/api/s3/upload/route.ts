import {
  GetBucketLocationCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function isWrongEndpointError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /must be addressed using the specified endpoint/i.test(msg) ||
    /PermanentRedirect/i.test(msg) ||
    /please send.*this endpoint/i.test(msg)
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | Blob | null;
    const bucket = (formData.get("bucket") as string | null)?.trim();
    const region = (formData.get("region") as string | null)?.trim();
    const accessKeyId = (formData.get("accessKeyId") as string | null)?.trim();
    const secretAccessKey = (formData.get("secretAccessKey") as string | null)?.trim();
    const key = (formData.get("key") as string | null)?.trim();

    if (!file || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
    }
    if (!bucket || !accessKeyId || !secretAccessKey || !key) {
      return NextResponse.json(
        { error: "Missing bucket, credentials, or key" },
        { status: 400 }
      );
    }

    let usedRegion = region || process.env.AWS_REGION || "us-east-1";
    let client = new S3Client({
      region: usedRegion,
      credentials: { accessKeyId, secretAccessKey },
    });

    const bytes = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream";

    const put = () =>
      client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

    try {
      await put();
    } catch (firstErr) {
      if (!isWrongEndpointError(firstErr)) throw firstErr;
      const locRes = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
      usedRegion = locRes.LocationConstraint?.trim() || "us-east-1";
      client = new S3Client({
        region: usedRegion,
        credentials: {
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        },
      });
      await put();
    }

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("S3 upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
