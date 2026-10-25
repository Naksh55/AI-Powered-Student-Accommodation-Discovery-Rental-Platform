import { ApiError, type College } from "./api";
import { getToken } from "./token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

// Free place search by OpenStreetMap (Nominatim). It is called straight from
// the browser, so each student's own connection carries their own searches.
// Its public usage policy allows searches a user triggers (not live
// autocomplete), at most 1 request per second, and requires crediting
// "© OpenStreetMap contributors". To switch to another service without a code
// change, set NEXT_PUBLIC_GEOCODER_URL to any Nominatim-compatible endpoint.
const GEOCODER_URL =
  process.env.NEXT_PUBLIC_GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";

type GeocoderResult = {
  lat: string;
  lon: string;
  type?: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
};

export type PlaceResult = {
  key: string;
  name: string; // short name, e.g. "Lovely Professional University"
  city: string;
  label: string; // full address line, so campuses with similar names can be told apart
  kind: string; // "University", "College", ...
  educational: boolean;
  latitude: number;
  longitude: number;
};

const EDUCATIONAL = new Set(["university", "college", "school"]);

function titleCase(s: string): string {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "in",
    limit: "6",
    addressdetails: "1",
  });
  // Only a CORS-safelisted header, so the browser doesn't need a preflight.
  const res = await fetch(`${GEOCODER_URL}?${params}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);

  const data = (await res.json()) as GeocoderResult[];
  const places = data
    .map((r, i): PlaceResult => {
      const a = r.address ?? {};
      return {
        key: `${i}-${r.lat}-${r.lon}`,
        name: r.name?.trim() || r.display_name.split(",")[0].trim(),
        city: a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? a.state_district ?? a.state ?? "",
        label: r.display_name,
        kind: r.type ? titleCase(r.type) : "Place",
        educational: EDUCATIONAL.has(r.type ?? ""),
        latitude: Number(r.lat),
        longitude: Number(r.lon),
      };
    })
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  // Universities and colleges first: a student searching for their college
  // doesn't want the bus stop outside it listed above it.
  return places.sort((a, b) => Number(b.educational) - Number(a.educational));
}

export async function addCollege(input: {
  name: string;
  city?: string;
  latitude: number;
  longitude: number;
}): Promise<College> {
  const token = getToken();
  if (!token) throw new ApiError(401, "Not signed in");
  const res = await fetch(`${API_BASE_URL}/colleges`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || `API error ${res.status}`);
  return res.json() as Promise<College>;
}
