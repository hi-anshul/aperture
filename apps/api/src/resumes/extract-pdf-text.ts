import pdf from "pdf-parse";

/**
 * Extract plain text from a PDF buffer for Claude resume extraction.
 * Throws if the PDF yields no usable text (e.g. scanned image-only PDFs).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdf(buffer);
  const text = result.text?.replace(/\u0000/g, "").trim() ?? "";

  if (!text) {
    throw new Error(
      "Could not extract text from this PDF. Try a text-based PDF (not a scanned image).",
    );
  }

  return text;
}
