const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

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

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

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
