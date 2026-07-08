import { cookies } from "next/headers";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DEFAULT_TIMEOUT_MS = 10_000;

export async function serverFetch<T>(
  path: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}/api${path}`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new Error(`API request timed out after ${timeoutMs}ms`);
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
