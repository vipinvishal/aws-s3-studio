import { generateTextWithJson } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";

type FileEntry = { key: string; name: string; size?: number; lastModified?: string | null };
type FolderEntry = { name: string; prefix: string };

type ParsedFilters = {
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  sizeMinBytes?: number;
  sizeMaxBytes?: number;
  nameContains?: string;
};

type ChatResponse = {
  message: string;
  filters?: ParsedFilters | null;
  match?: string[] | null;
};

async function listAllFilesInBucket(params: {
  bucket: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  maxFiles?: number;
}): Promise<FileEntry[]> {
  const { bucket, region, accessKeyId, secretAccessKey, maxFiles = 2000 } = params;

  const client = new S3Client({
    region: (region || process.env.AWS_REGION || "us-east-1").trim(),
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  });

  const files: FileEntry[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const res: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    (res.Contents ?? [])
      .filter((o) => o.Key && !o.Key.endsWith("/"))
      .forEach((o) => {
        if (files.length >= maxFiles) return;
        const key = o.Key as string;
        const name = key.split("/").pop() || key;
        files.push({
          key,
          name,
          size: o.Size ?? undefined,
          lastModified: o.LastModified?.toISOString() ?? null,
        });
      });

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken && files.length < maxFiles);

  return files;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message: userMessage,
      folderPath = "",
      files = [],
      folders = [],
      bucketName,
      region,
      credentials,
    } = body as {
      message: string;
      folderPath?: string;
      files: FileEntry[];
      folders: FolderEntry[];
      bucketName?: string;
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string } | null;
    };

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const folderLabel = folderPath ? folderPath.replace(/\/$/, "") || "root" : "root";

    let effectiveFiles: FileEntry[] = files;

    if (bucketName && credentials?.accessKeyId && credentials.secretAccessKey) {
      try {
        effectiveFiles = await listAllFilesInBucket({
          bucket: bucketName,
          region,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        });
      } catch (e) {
        console.error("Failed to list all bucket objects for chat, falling back to current folder only:", e);
        effectiveFiles = files;
      }
    }

    const fileList =
      effectiveFiles.length > 0
        ? effectiveFiles
            .slice(0, 400)
            .map(
              (f) =>
                `- ${f.name} (key: ${f.key}${f.size != null ? `, ${f.size} bytes` : ""}${f.lastModified ? `, modified: ${f.lastModified}` : ""})`
            )
            .join("\n")
        : "(no files in this folder)";
    const subfoldersLine =
      folders.length > 0 ? `Subfolders: ${folders.map((f) => f.name).join(", ")}.` : "(no subfolders)";

    const prompt = `You are a helpful assistant for an S3 bucket workspace. The user can ask anything about their S3 bucket: list or describe files, filter (e.g. "show only PDFs", "give me the 2 files", "last 7 days"), get a short summary/report, or find specific files – even if they live in different folders.

CURRENT FOLDER VIEW: ${folderLabel}
Bucket (for context only, do not mention unless user asks): ${bucketName || "(unknown)"}

FILES across the bucket (use exact "key" values if you return match):
${fileList}

${subfoldersLine}

USER MESSAGE: ${userMessage.trim()}

Important constraints:
- You do NOT have conversation memory. Treat each USER MESSAGE as independent; never say you "already applied" a filter from earlier messages.
- When the user asks to "list" or "show all" files of a certain type (e.g. "what all *png file we have"), return a clear list of those files using their exact "key" paths (e.g. "images/logo.png"). Use "match" with the same keys.
- Only mention filters if the user explicitly asked you to narrow or change the view in THIS message (e.g. "only PDFs", "last 7 days"). When you mention a filter, you MUST also return a consistent "filters" object that reflects what you described.
- If the user asks "what filter?" or something similar without enough context, explain that you don't see any filter request in THIS message and briefly describe what kinds of filters are available.

Respond with a JSON object only, no other text:
{
  "message": "Your friendly, direct answer in 2-4 sentences. Mention specific file names when relevant. If they asked to filter or 'give me X files', say what you're showing and list the files.",
  "filters": null or a filter object to apply: { "fileType": "pdf" | null, "dateFrom": "ISO date" | null, "dateTo": "ISO date" | null, "sizeMinBytes": number | null, "sizeMaxBytes": number | null, "nameContains": "substring" | null }. Only set if the user asked to filter/narrow (e.g. "only PDFs", "last 7 days", "larger than 5MB"). Use null for unspecified. For "last 7 days" set dateFrom to 7 days ago in ISO format.
  "match": null or an array of file keys (exact "key" values from the list above) that match the user's request. Use when they ask for specific files (e.g. "the 2 files", "Chains and clawdbot") so the app can highlight them. Only include keys from the FILES list.
}

Examples:
- "what's in this folder?" -> message describing files, filters: null, match: null
- "give me the 2 files" -> message listing the 2 files, filters: null, match: [key1, key2]
- "show only PDFs" -> message confirming, filters: { "fileType": "pdf", ... }, match: null
- "clear filters" or "reset filters" -> message confirming, filters: null, match: null
- "summarize" / "generate a one-pager" -> message with summary or report text, filters: null, match: null`;

    const result = await generateTextWithJson<ChatResponse>(prompt, {
      fallback: { message: "I couldn't process that. Try asking about this folder's files, applying a filter, or asking for a summary.", filters: null, match: null },
    });

    const out: ChatResponse = {
      message: result.message?.trim() || "No response.",
      filters: result.filters ?? null,
      match: Array.isArray(result.match) ? result.match : null,
    };

    return NextResponse.json(out);
  } catch (err) {
    console.error("AI chat error:", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
