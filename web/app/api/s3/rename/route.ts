import {
  CopyObjectCommand,
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

async function getBucketRegion(bucket: string, client: S3Client): Promise<string> {
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
      oldKey,
      newKey,
    } = body as {
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region?: string;
      oldKey: string;
      newKey: string;
    };

    if (!bucket?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim()) {
      return NextResponse.json(
        { error: "Missing bucket or credentials" },
        { status: 400 }
      );
    }
    const oldK = (oldKey ?? "").trim();
    const newK = (newKey ?? "").trim();
    if (!oldK || !newK) {
      return NextResponse.json({ error: "Missing oldKey or newKey" }, { status: 400 });
    }
    if (oldK === newK) {
      return NextResponse.json({ error: "oldKey and newKey are the same" }, { status: 400 });
    }

    let usedRegion = (region || process.env.AWS_REGION || "us-east-1").trim();
    let client = makeClient(accessKeyId, secretAccessKey, usedRegion);
    const bucketName = bucket.trim();

    const run = async (fn: () => Promise<unknown>) => {
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

    if (oldK.endsWith("/")) {
      if (!newK.endsWith("/")) {
        return NextResponse.json({ error: "Folder rename must end with /" }, { status: 400 });
      }
      let continuationToken: string | undefined;
      const toCopy: { from: string; to: string }[] = [];
      do {
        const listRes = (await run(() =>
          client.send(
            new ListObjectsV2Command({
              Bucket: bucketName,
              Prefix: oldK,
              MaxKeys: 1000,
              ContinuationToken: continuationToken,
            })
          )
        )) as ListObjectsV2CommandOutput;
        listRes.Contents?.forEach((o) => {
          if (o.Key) {
            const suffix = o.Key.slice(oldK.length);
            toCopy.push({ from: o.Key, to: newK + suffix });
          }
        });
        continuationToken = listRes.NextContinuationToken;
      } while (continuationToken);

      for (const { from, to } of toCopy) {
        await run(() =>
          client.send(
            new CopyObjectCommand({
              Bucket: bucketName,
              CopySource: `${bucketName}/${encodeURIComponent(from)}`,
              Key: to,
            })
          )
        );
      }
      for (let i = toCopy.length - 1; i >= 0; i--) {
        await run(() =>
          client.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: { Objects: [{ Key: toCopy[i].from }], Quiet: true },
            })
          )
        );
      }
      return NextResponse.json({ renamed: true });
    }

    await run(() =>
      client.send(
        new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${encodeURIComponent(oldK)}`,
          Key: newK,
        })
      )
    );
    await run(() =>
      client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: [{ Key: oldK }], Quiet: true },
        })
      )
    );
    return NextResponse.json({ renamed: true });
  } catch (err) {
    console.error("S3 rename error:", err);
    const message = err instanceof Error ? err.message : "Rename failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
