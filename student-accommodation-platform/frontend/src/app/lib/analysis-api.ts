import { ApiError } from "./api";
import { getToken } from "./token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type QualityIssue = { code: string; message: string };

export type ListingAnalysis = {
  // Deterministic checks: always present.
  score: number;
  issues: QualityIssue[];
  // AI half: may be unavailable (not configured, provider error).
  ai_available: boolean;
  ai_note: string | null;
  improved_description: string | null;
  suggestions: string[];
};

async function authedRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new ApiError(401, "Not signed in");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || `API error ${res.status}`);
  return res.json() as Promise<T>;
}

export function analyzeListing(listingId: string): Promise<ListingAnalysis> {
  return authedRequest<ListingAnalysis>(`/listings/${listingId}/analyze`, { method: "POST" });
}

export function saveDescription(listingId: string, description: string): Promise<unknown> {
  return authedRequest(`/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify({ description }),
  });
}
