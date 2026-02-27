import { generateText } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

type FileEntry = { key: string; name: string; size?: number; lastModified?: string | null };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = "one-pager", folderPath, files = [], bucketName } = body as {
      type?: "one-pager" | "digest";
      folderPath?: string;
      files: FileEntry[];
      bucketName?: string;
    };

    const fileList =
      files.length > 0
        ? files
            .slice(0, 500)
            .map((f) => `- ${f.name} (${f.size != null ? `${(f.size / 1024).toFixed(1)} KB` : "?"}${f.lastModified ? `, ${f.lastModified}` : ""})`)
            .join("\n")
        : "(no files)";

    const scope = folderPath ? `Folder: ${folderPath}` : "Bucket root";
    const bucket = bucketName ? `Bucket: ${bucketName}\n` : "";

    const prompt =
      type === "digest"
        ? `Generate a short "Weekly digest" style summary (3-5 bullet points) for this S3 scope. Be concise.

${bucket}${scope}

FILES:
${fileList}

Output plain text, no markdown headers. Focus on: what's here, file types, approximate size, and any notable patterns.`
        : `Generate a one-pager summary (one short paragraph, then optional bullet points) for this S3 scope. Suitable for sharing or quick reference.

${bucket}${scope}

FILES:
${fileList}

Output plain text. Start with one paragraph (2-3 sentences), then up to 5 bullet points if useful.`;

    const report = await generateText(prompt);

    return NextResponse.json({
      report: report.trim(),
      type,
      scope: folderPath || "root",
    });
  } catch (err) {
    console.error("AI report error:", err);
    const message = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
