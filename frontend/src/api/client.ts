import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new ApiError(
      "networkError",
      error instanceof Error ? error.message : "Network request failed.",
      0,
      null,
    );
  }

  if (!response.ok) {
    let code = "internalError";
    let message = response.statusText || "Request failed.";
    let requestId: string | null = null;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string; requestId?: string | null } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
      requestId = body.error?.requestId ?? null;
    } catch {
      // Keep the fallback values when the body is not JSON.
    }
    throw new ApiError(code, message, response.status, requestId);
  }

  return (await response.json()) as T;
}
