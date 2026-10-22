"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import {
  describeError,
  formatDate,
  getReceivedInquiries,
  setInquiryStatus,
  type InquiryStatus,
  type ReceivedInquiry,
} from "@/app/lib/inquiries-api";

const STATUS_STYLE: Record<InquiryStatus, { label: string; color: string }> = {
  new: { label: "New", color: "var(--raw-marigold-dark)" },
  contacted: { label: "Contacted", color: "var(--raw-brand)" },
  closed: { label: "Closed", color: "var(--raw-ink-soft)" },
};

export default function OwnerInquiriesPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<ReceivedInquiry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signed-out") router.push("/login");
    else if (status === "signed-in" && user?.role !== "owner") router.push("/search");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "signed-in" || user?.role !== "owner") return;
    getReceivedInquiries()
      .then((data) => {
        setInquiries(data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [status, user]);

  async function update(id: string, next: InquiryStatus) {
    setActionError(null);
    try {
      const updated = await setInquiryStatus(id, next);
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  if (status === "loading" || status === "signed-out") {
    return <main className="max-w-3xl mx-auto p-6 md:p-10 text-ink-soft">Loading…</main>;
  }

  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10">
      <h1 className="font-serif text-3xl">Inquiries</h1>
      <p className="text-ink-soft mt-1 mb-8">
        Students who messaged you about your listings.
        {loadState === "ready" && inquiries.length > 0 && ` ${newCount} new.`}
      </p>

      {actionError && <p className="text-brick text-sm mb-4">{actionError}</p>}
      {loadState === "loading" && <p className="text-ink-soft">Loading inquiries…</p>}
      {loadState === "error" && (
        <div className="border border-brick p-4 text-brick">
          Couldn&apos;t load your inquiries. Check that the backend is running.
        </div>
      )}
      {loadState === "ready" && inquiries.length === 0 && (
        <div className="border border-line-soft p-6 text-center text-ink-soft">
          No inquiries yet. They show up here when a student messages you from a listing page.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {inquiries.map((i) => {
          const s = STATUS_STYLE[i.status];
          return (
            <article
              key={i.id}
              className="bg-paper-raised border border-line-soft p-4"
              style={{ borderLeftWidth: "4px", borderLeftColor: s.color }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/listing/${i.listing_id}`} className="font-serif text-lg hover:underline">
                    {i.listing_title}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {i.student_name} ·{" "}
                    <a href={`mailto:${i.student_email}`} className="text-brand underline">
                      {i.student_email}
                    </a>
                    {i.contact_phone && (
                      <>
                        {" "}·{" "}
                        <a href={`tel:${i.contact_phone}`} className="text-brand underline">
                          {i.contact_phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 border shrink-0" style={{ color: s.color, borderColor: s.color }}>
                  {s.label}
                </span>
              </div>

              <p className="mt-3 text-sm whitespace-pre-wrap">{i.message}</p>

              <p className="mt-3 text-xs text-ink-soft">
                Received {formatDate(i.created_at)}
                {i.move_in_date && ` · Wants to move in ${formatDate(i.move_in_date)}`}
              </p>

              {i.status !== "closed" && (
                <div className="mt-3 flex gap-4 text-sm">
                  {i.status === "new" && (
                    <button onClick={() => update(i.id, "contacted")} className="text-brand underline">
                      Mark contacted
                    </button>
                  )}
                  <button onClick={() => update(i.id, "closed")} className="text-ink-soft underline">
                    Close
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
