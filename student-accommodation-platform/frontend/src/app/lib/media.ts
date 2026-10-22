const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

// The API lives at <origin>/api/v1 and uploaded files at <origin>/uploads,
// so the file origin is the API URL minus its /api/v1 suffix.
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/**
 * Turns a stored image URL into one the browser can load. Photos uploaded
 * to the local backend are stored as "/uploads/<file>" and must be fetched
 * from the backend; full http(s) URLs (e.g. a CDN) are returned as they are.
 */
export function imageSrc(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}
