import { generateTextWithJson } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export type CommandIntent =
  | { action: "find"; query: string }
  | { action: "summarize"; scope?: string }
  | { action: "create_folder"; name: string }
  | { action: "upload"; hint?: string }
  | { action: "report"; type?: "one-pager" | "digest" }
  | { action: "navigate"; path?: string }
  | { action: "none"; message: string };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const prompt = `The user typed a command in a command bar (like Cmd+K). Interpret their intent. Reply with ONLY a JSON object.

User typed: "${text.trim()}"

Possible actions:
- find / search: {"action": "find", "query": "their search query"}
- summarize: {"action": "summarize", "scope": "optional: folder name or 'bucket'"}
- create folder: {"action": "create_folder", "name": "suggested folder name"}
- upload: {"action": "upload", "hint": "optional hint"}
- report: {"action": "report", "type": "one-pager" or "digest"}
- navigate: {"action": "navigate", "path": "folder path"}
- unclear: {"action": "none", "message": "short suggestion"}

Use the most likely single action. For "find X" or "search for X" use action "find" with query X. For "new folder X" use "create_folder" with name X.`;

    const intent = await generateTextWithJson<CommandIntent>(prompt, {
      fallback: { action: "none", message: "Try: find …, summarize, new folder …, or report" },
    });

    return NextResponse.json({ intent });
  } catch (err) {
    console.error("AI command error:", err);
    const message = err instanceof Error ? err.message : "Command parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
