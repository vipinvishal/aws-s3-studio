import {
  DeleteObjectsCommand,
  GetBucketLocationCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

function isWrongEndpointError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
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

async function getBucketRegion(bucket: string, client: S3Client): Promise<string> {
  const res = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
  const r = res.LocationConstraint?.trim();
  return r || "us-east-1";
}

async function listAllKeys(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );
    res.Contents?.forEach((o) => {
      if (o.Key) keys.push(o.Key);
    });
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return keys;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bucket,
      accessKeyId,
      secretAccessKey,
      region,
      keys = [],
    } = body as {
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region?: string;
      keys: string[];
    };

    if (!bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim()) {
      return NextResponse.json(
        { error: "Missing bucket or credentials" },
        { status: 400 }
      );
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "Missing or empty keys array" }, { status: 400 });
    }

    let usedRegion = (region || process.env.AWS_REGION || "us-east-1").trim();
    let client = makeClient(accessKeyId, secretAccessKey, usedRegion);

    const toDelete = new Set<string>();
    for (const key of keys) {
      const k = key.trim();
      if (!k) continue;
      if (k.endsWith("/")) {
        const nested = await listAllKeys(client, bucket.trim(), k);
        nested.forEach((x) => toDelete.add(x));
        toDelete.add(k);
      } else {
        toDelete.add(k);
      }
    }

    const keyArray = Array.from(toDelete);
    for (let i = 0; i < keyArray.length; i += 1000) {
      const chunk = keyArray.slice(i, i + 1000);
      const command = new DeleteObjectsCommand({
        Bucket: bucket.trim(),
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      });
      try {
        await client.send(command);
      } catch (err) {
        if (isWrongEndpointError(err)) {
          usedRegion = await getBucketRegion(bucket.trim(), client);
          client = makeClient(accessKeyId, secretAccessKey, usedRegion);
          await client.send(command);
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json({ deleted: keyArray.length });
  } catch (err) {
    console.error("S3 delete error:", err);
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
