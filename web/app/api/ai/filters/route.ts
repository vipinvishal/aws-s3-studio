import { generateTextWithJson } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export type ParsedFilters = {
  fileType?: string;
  dateFrom?: string;
  dateTo?: string;
  sizeMinBytes?: number;
  sizeMaxBytes?: number;
  nameContains?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const prompt = `Parse the user's natural language filter into a structured filter. Reply with ONLY a JSON object, no other text.

User said: "${text.trim()}"

Output format (use null for unspecified):
{
  "fileType": "extension without dot, e.g. pdf, csv, or null",
  "dateFrom": "ISO date string for 'after this date', or null",
  "dateTo": "ISO date string for 'before this date', or null",
  "sizeMinBytes": number or null (e.g. "larger than 5MB" -> 5242880),
  "sizeMaxBytes": number or null (e.g. "smaller than 1MB" -> 1048576),
  "nameContains": "substring to search in filename, or null"
}

Examples:
- "Show only PDFs" -> {"fileType": "pdf", "dateFrom": null, "dateTo": null, "sizeMinBytes": null, "sizeMaxBytes": null, "nameContains": null}
- "Files updated in the last 7 days" -> use dateFrom as 7 days ago in ISO format, rest null
- "Larger than 5MB" -> {"fileType": null, "dateFrom": null, "dateTo": null, "sizeMinBytes": 5242880, "sizeMaxBytes": null, "nameContains": null}
- "invoices from last month" -> dateFrom/dateTo for last month, nameContains "invoice", rest null
`;

    const filters = await generateTextWithJson<ParsedFilters>(prompt, {
      fallback: {},
    });

    return NextResponse.json({ filters });
  } catch (err) {
    console.error("AI filters error:", err);
    const message = err instanceof Error ? err.message : "Parse filters failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
