import { getToken } from "./token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type UserRole = "student" | "owner" | "admin";

export type ListingOut = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  room_type: "single" | "shared_2" | "shared_3_plus" | "flat";
  monthly_rent: number;
  has_ac: boolean;
  has_wifi: boolean;
  food_included: boolean;
  address_line: string;
  city: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  amenities: string[];
  image_urls: string[];
};

export type ListingFilters = {
  min_budget?: number;
  max_budget?: number;
  room_type?: ListingOut["room_type"];
  has_ac?: boolean;
  has_wifi?: boolean;
  food_included?: boolean;
  city?: string;
  lat?: number;
  lng?: number;
  max_distance_km?: number;
};

export type ListingCreateInput = {
  title: string;
  description?: string;
  room_type: ListingOut["room_type"];
  monthly_rent: number;
  has_ac: boolean;
  has_wifi: boolean;
  food_included: boolean;
  address_line: string;
  city: string;
  latitude: number;
  longitude: number;
  amenity_names: string[];
};

export type CurrentUser = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (authenticated) {
    const token = getToken();
    if (!token) throw new ApiError(401, "Not signed in");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// -- Auth --

export function signup(input: {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  phone_number?: string;
}): Promise<{ access_token: string }> {
  return apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<{ access_token: string }> {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/users/me", {}, true);
}

// -- Listings (public) --

export function getListings(filters: ListingFilters = {}): Promise<ListingOut[]> {
  // Milestone 3 adds a natural-language endpoint that resolves a plain-text
  // query into this same filter object before calling here.
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  const qs = params.toString();
  return apiFetch<ListingOut[]>(`/listings${qs ? `?${qs}` : ""}`);
}

export function getListing(id: string): Promise<ListingOut> {
  return apiFetch<ListingOut>(`/listings/${id}`);
}

// -- Listings (owner, authenticated) --

export function getMyListings(): Promise<ListingOut[]> {
  return apiFetch<ListingOut[]>("/listings/mine", {}, true);
}

export function createListing(input: ListingCreateInput): Promise<ListingOut> {
  return apiFetch<ListingOut>(
    "/listings",
    { method: "POST", body: JSON.stringify(input) },
    true
  );
}

export function deleteListing(id: string): Promise<void> {
  return apiFetch<void>(`/listings/${id}`, { method: "DELETE" }, true);
}

export function uploadListingImage(listingId: string, file: File): Promise<{ id: string; url: string }> {
  const token = getToken();
  if (!token) return Promise.reject(new ApiError(401, "Not signed in"));

  const formData = new FormData();
  formData.append("file", file);

  return fetch(`${API_BASE_URL}/listings/${listingId}/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  });
}

// -- Natural-language search (Milestone 3) --

export type ParsedSearchFilters = {
  min_budget: number | null;
  max_budget: number | null;
  room_type: ListingOut["room_type"] | null;
  has_ac: boolean | null;
  has_wifi: boolean | null;
  food_included: boolean | null;
  city: string | null;
  max_distance_km: number | null;
};

export type NaturalLanguageSearchResult = {
  parsed_filters: ParsedSearchFilters;
  results: ListingOut[];
};

export function naturalLanguageSearch(query: string): Promise<NaturalLanguageSearchResult> {
  return apiFetch<NaturalLanguageSearchResult>("/listings/search/natural", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export { ApiError };
