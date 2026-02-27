import { generateTextWithJson } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileNames = [], existingFolders = [] } = body as {
      fileNames: string[];
      existingFolders: string[];
    };

    if (!fileNames?.length) {
      return NextResponse.json({ suggestedFolder: "", suggestedTags: [] }, { status: 200 });
    }

    const list = fileNames.slice(0, 20).join(", ");
    const folders = existingFolders.length ? existingFolders.join(", ") : "(none yet)";

    const prompt = `Based on these file names about to be uploaded, suggest a single folder path (e.g. "invoices/2024" or "reports") and a few tags. Use only alphanumeric, hyphen, underscore. Prefer reusing one of the existing folders if it fits.

File names: ${list}
Existing folders: ${folders}

Reply with ONLY a JSON object:
{"suggestedFolder": "path/without/leading/slash", "suggestedTags": ["tag1", "tag2", "tag3"]}
Use empty string for suggestedFolder if root is best. Max 5 tags.`;

    const result = await generateTextWithJson<{ suggestedFolder: string; suggestedTags: string[] }>(
      prompt,
      { fallback: { suggestedFolder: "", suggestedTags: [] } }
    );

    return NextResponse.json({
      suggestedFolder: result.suggestedFolder || "",
      suggestedTags: Array.isArray(result.suggestedTags) ? result.suggestedTags.slice(0, 5) : [],
    });
  } catch (err) {
    console.error("AI suggest-upload error:", err);
    const message = err instanceof Error ? err.message : "Suggestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
