// Legacy Gemini helper - replaced by Hugging Face integration.
// Keep a small stub to avoid import errors in case any file still references geminiChat.
export async function geminiChat(): Promise<string> {
  throw new Error('geminiChat is deprecated. Use callHuggingFace() via src/app/lib/hf.ts instead.');
}
