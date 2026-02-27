import { GoogleGenerativeAI } from "@google/generative-ai";

function getClient() {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key?.trim()) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key.trim());
}

// Default follows official docs: https://ai.google.dev/gemini-api/docs/text-generation
export function getGeminiModel(modelId = "gemini-3-flash-preview") {
  return getClient().getGenerativeModel({ model: modelId });
}

export async function generateText(prompt: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;
  if (!response.text) throw new Error("No text in Gemini response");
  return response.text();
}

export async function generateTextWithJson<T = unknown>(
  prompt: string,
  options?: { fallback?: T }
): Promise<T> {
  const text = await generateText(prompt);
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    if (options?.fallback !== undefined) return options.fallback;
    throw new Error("No JSON object in response");
  }
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    if (options?.fallback !== undefined) return options.fallback;
    throw new Error("Invalid JSON in response");
  }
}
