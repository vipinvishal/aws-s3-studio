import { generateText } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

type FileEntry = { key: string; name: string; size?: number; lastModified?: string | null };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, folderPath, files = [], subfolderNames = [] } = body as {
      question: string;
      folderPath?: string;
      files: FileEntry[];
      subfolderNames?: string[];
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const folderLabel = folderPath ? folderPath.replace(/\/$/, "") || "root" : "root";
    const fileList =
      files.length > 0
        ? files
            .slice(0, 300)
            .map((f) => `- ${f.name} (key: ${f.key}${f.size != null ? `, ${f.size} bytes` : ""}${f.lastModified ? `, modified: ${f.lastModified}` : ""})`)
            .join("\n")
        : "(no files in this folder)";
    const subfoldersLine =
      subfolderNames.length > 0
        ? `SUBFOLDERS in this folder: ${subfolderNames.join(", ")}.`
        : "(no subfolders)";

    const prompt = `You are an assistant for an S3 bucket workspace. You are describing ONLY the folder below. Use the exact folder name "${folderLabel}" when you refer to it. Do not substitute a different folder name.

CURRENT FOLDER (the one you are describing): ${folderLabel}

FILES in this folder:
${fileList}

${subfoldersLine}

USER QUESTION: ${question.trim()}

Answer in 2-4 short sentences. Mention specific file names from the list above when relevant. Do not make up files. If this folder has no files, say so and use the folder name "${folderLabel}".`;

    const answer = await generateText(prompt);

    return NextResponse.json({ answer: answer.trim() });
  } catch (err) {
    console.error("AI ask error:", err);
    const message = err instanceof Error ? err.message : "Ask failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
