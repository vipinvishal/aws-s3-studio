import {
  GetBucketLocationCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

function isWrongEndpointError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : String(err);
  return (
    /must be addressed using the specified endpoint/i.test(msg) ||
    /PermanentRedirect/i.test(msg) ||
    /please send.*this endpoint/i.test(msg)
  );
}

function makeClient(
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): S3Client {
  return new S3Client({
    region: region.trim(),
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });
}

async function getBucketRegion(
  bucket: string,
  client: S3Client
): Promise<string> {
  const res = await client.send(
    new GetBucketLocationCommand({ Bucket: bucket })
  );
  // us-east-1 has null/empty LocationConstraint
  const r = res.LocationConstraint?.trim();
  return r || "us-east-1";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, accessKeyId, secretAccessKey, region, prefix = "" } = body as {
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region?: string;
      prefix?: string;
    };

    if (!bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim()) {
      return NextResponse.json(
        { error: "Missing bucket, accessKeyId, or secretAccessKey" },
        { status: 400 }
      );
    }

    const bucketName = bucket.trim();
    let usedRegion = (region || process.env.AWS_REGION || "us-east-1").trim();
    let client = makeClient(accessKeyId, secretAccessKey, usedRegion);

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Delimiter: "/",
      Prefix: prefix.trim() || undefined,
      MaxKeys: 1000,
    });

    let response;
    try {
      response = await client.send(command);
    } catch (firstErr) {
      if (!isWrongEndpointError(firstErr)) throw firstErr;
      try {
        const discoveryClient = makeClient(accessKeyId, secretAccessKey, "us-east-1");
        usedRegion = await getBucketRegion(bucketName, discoveryClient);
        client = makeClient(accessKeyId, secretAccessKey, usedRegion);
        response = await client.send(command);
      } catch (discoverErr) {
        console.error("Bucket region discovery failed:", discoverErr);
        throw new Error(
          "Bucket is in a different region. Open Connect, select the correct AWS Region (e.g. Mumbai for ap-south-1), and Save connection again."
        );
      }
    }

    // CommonPrefixes = "folders" (keys that contain delimiter after the prefix)
    const fromPrefixes =
      response.CommonPrefixes?.map((p) => ({
        name: (p.Prefix || "").replace(prefix, "").replace(/\/$/, ""),
        prefix: p.Prefix || "",
      })).filter((f) => f.name) ?? [];

    // S3 "empty folders" are 0-byte objects with key ending in /
    const fromContents =
      response.Contents?.filter(
        (o) => o.Key && o.Key !== prefix && o.Key.endsWith("/")
      ).map((o) => ({
        name: (o.Key || "").replace(prefix, "").replace(/\/$/, ""),
        prefix: o.Key || "",
      })) ?? [];

    const folderMap = new Map<string, string>();
    [...fromPrefixes, ...fromContents].forEach((f) => {
      if (f.name && !folderMap.has(f.name)) folderMap.set(f.name, f.prefix);
    });
    const folders = Array.from(folderMap.entries()).map(([name, prefix]) => ({
      name,
      prefix,
    }));

    // Files = objects that are not folder placeholders
    const files =
      response.Contents?.filter(
        (o) => o.Key && o.Key !== prefix && !o.Key.endsWith("/")
      ).map((o) => ({
        key: o.Key,
        name: (o.Key || "").split("/").pop() || o.Key,
        size: o.Size ?? 0,
        lastModified: o.LastModified?.toISOString() ?? null,
      })) ?? [];

    return NextResponse.json({
      folders,
      files,
      resolvedRegion: usedRegion,
    });
  } catch (err) {
    console.error("S3 list error:", err);
    const message = err instanceof Error ? err.message : "Failed to list bucket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
