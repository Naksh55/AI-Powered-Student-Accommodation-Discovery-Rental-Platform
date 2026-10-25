import { ApiError } from "./api";
import { getToken } from "./token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type AdminListing = {
  id: string;
  title: string;
  description: string | null;
  room_type: "single" | "shared_2" | "shared_3_plus" | "flat";
  monthly_rent: number;
  address_line: string;
  city: string;
  image_urls: string[];
  owner_name: string;
  owner_email: string;
  created_at: string;
};

async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new ApiError(401, "Not signed in");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || `API error ${res.status}`);
  return res.json() as Promise<T>;
}

export function getPendingListings(): Promise<AdminListing[]> {
  return authedRequest<AdminListing[]>("/admin/listings/pending");
}

export function approveListing(id: string) {
  return authedRequest(`/admin/listings/${id}/approve`, { method: "POST" });
}

export function rejectListing(id: string) {
  return authedRequest(`/admin/listings/${id}/reject`, { method: "POST" });
}
