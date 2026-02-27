import {
  DeleteObjectsCommand,
  GetBucketLocationCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
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

async function getBucketRegion(
  bucket: string,
  client: S3Client
): Promise<string> {
  const res = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
  const r = res.LocationConstraint?.trim();
  return r || "us-east-1";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bucket,
      accessKeyId,
      secretAccessKey,
      region,
      prefix,
    } = body as {
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region?: string;
      prefix: string;
    };

    if (!bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim()) {
      return NextResponse.json(
        { error: "Missing bucket or credentials" },
        { status: 400 }
      );
    }

    const folderPrefix = (prefix ?? "").trim();
    if (!folderPrefix || !folderPrefix.endsWith("/")) {
      return NextResponse.json(
        { error: "prefix must be a folder key ending with /" },
        { status: 400 }
      );
    }

    let usedRegion = (region || process.env.AWS_REGION || "us-east-1").trim();
    let client = makeClient(accessKeyId, secretAccessKey, usedRegion);
    const bucketName = bucket.trim();

    const run = async <T>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        if (isWrongEndpointError(err)) {
          usedRegion = await getBucketRegion(bucketName, client);
          client = makeClient(accessKeyId, secretAccessKey, usedRegion);
          return await fn();
        }
        throw err;
      }
    };

    // Collect all keys under the prefix
    const keysToDelete: string[] = [];
    let continuationToken: string | undefined;

    do {
      const listRes: ListObjectsV2CommandOutput = await run(() =>
        client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: folderPrefix,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          })
        )
      );

      (listRes.Contents ?? []).forEach((o) => {
        if (o.Key) keysToDelete.push(o.Key);
      });

      continuationToken = listRes.IsTruncated
        ? listRes.NextContinuationToken
        : undefined;
    } while (continuationToken);

    if (keysToDelete.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete in batches of up to 1000 keys per request
    const batchSize = 1000;
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);
      await run(() =>
        client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: batch.map((Key) => ({ Key })),
              Quiet: true,
            },
          })
        )
      );
    }

    return NextResponse.json({ deleted: keysToDelete.length });
  } catch (err) {
    console.error("S3 delete-folder error:", err);
    const message = err instanceof Error ? err.message : "Delete folder failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

