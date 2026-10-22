import { ApiError } from "./api";
import { getToken } from "./token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type InquiryStatus = "new" | "contacted" | "closed";

export type Inquiry = {
  id: string;
  listing_id: string;
  listing_title: string;
  status: InquiryStatus;
  message: string;
  contact_phone: string | null;
  move_in_date: string | null; // YYYY-MM-DD
  created_at: string;
};

// What an owner sees: the same, plus who sent it.
export type ReceivedInquiry = Inquiry & {
  student_name: string;
  student_email: string;
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

export function sendInquiry(input: {
  listing_id: string;
  message: string;
  contact_phone?: string;
  move_in_date?: string;
}): Promise<Inquiry> {
  return authedRequest<Inquiry>("/inquiries", { method: "POST", body: JSON.stringify(input) });
}

export function getMyInquiries(): Promise<Inquiry[]> {
  return authedRequest<Inquiry[]>("/inquiries/mine");
}

export function getReceivedInquiries(): Promise<ReceivedInquiry[]> {
  return authedRequest<ReceivedInquiry[]>("/inquiries/received");
}

export function setInquiryStatus(id: string, status: InquiryStatus): Promise<ReceivedInquiry> {
  return authedRequest<ReceivedInquiry>(`/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** Turns an API error into one readable sentence (FastAPI sends {"detail": ...}). */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    try {
      const detail = JSON.parse(err.message).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail[0]?.msg) {
        return String(detail[0].msg).replace(/^Value error, /, "");
      }
    } catch {
      /* not JSON: fall through */
    }
  }
  return "Something went wrong. Check that the backend is running and try again.";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
