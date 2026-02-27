import { generateText } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

type FileEntry = { key: string; name: string; size?: number; lastModified?: string | null };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, files = [] } = body as { query: string; files: FileEntry[] };

    if (!query?.trim()) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const fileList =
      files.length > 0
        ? files
            .slice(0, 200)
            .map((f) => `- ${f.name} (key: ${f.key}${f.size != null ? `, size: ${f.size}` : ""}${f.lastModified ? `, modified: ${f.lastModified}` : ""})`)
            .join("\n")
        : "(no files in current view)";

    const prompt = `You are a file search assistant. Given the following list of files in an S3 bucket folder, answer the user's search question.

FILES:
${fileList}

USER QUESTION: ${query.trim()}

Instructions:
- If the user is asking which files match a criteria (e.g. "invoices", "PDFs", "from last week"), respond with a JSON object: {"match": ["key1", "key2", ...]} listing the keys of matching files. Only include keys from the list above. If none match, use {"match": []}.
- If the user is asking a general question (e.g. "what's in this folder?", "how many PDFs?"), answer in 1-2 short sentences, then if relevant add a JSON object on a new line: {"match": ["key1", ...]} for any files you referenced.
- Prefer responding with valid JSON when the intent is clearly to filter or find files. Use the exact "key" values from the list.`;

    const response = await generateText(prompt);

    const jsonMatch = response.match(/\{[\s\S]*"match"[\s\S]*\}/);
    let match: string[] = [];
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { match?: string[] };
        if (Array.isArray(parsed.match)) match = parsed.match;
      } catch {
        // ignore
      }
    }

    const answer = response.replace(/\{[\s\S]*"match"[\s\S]*\}/, "").trim();

    return NextResponse.json({
      answer: answer || response.trim(),
      match: match,
    });
  } catch (err) {
    console.error("AI query error:", err);
    const message = err instanceof Error ? err.message : "AI query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
