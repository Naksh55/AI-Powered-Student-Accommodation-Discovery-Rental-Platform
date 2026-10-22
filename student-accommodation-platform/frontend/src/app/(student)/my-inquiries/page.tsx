"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import {
  formatDate,
  getMyInquiries,
  type Inquiry,
  type InquiryStatus,
} from "@/app/lib/inquiries-api";

const STATUS_TEXT: Record<InquiryStatus, { label: string; color: string }> = {
  new: { label: "Waiting for the owner", color: "var(--raw-marigold-dark)" },
  contacted: { label: "The owner has been in touch", color: "var(--raw-brand)" },
  closed: { label: "Closed", color: "var(--raw-ink-soft)" },
};

export default function MyInquiriesPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (status === "signed-out") router.push("/login");
    else if (status === "signed-in" && user?.role === "owner") router.push("/inquiries");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "signed-in" || user?.role !== "student") return;
    getMyInquiries()
      .then((data) => {
        setInquiries(data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [status, user]);

  if (status === "loading" || status === "signed-out") {
    return <main className="max-w-3xl mx-auto p-6 md:p-10 text-ink-soft">Loading…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10">
      <h1 className="font-serif text-3xl">My inquiries</h1>
      <p className="text-ink-soft mt-1 mb-8">Messages you&apos;ve sent to owners and where they stand.</p>

      {loadState === "loading" && <p className="text-ink-soft">Loading…</p>}
      {loadState === "error" && (
        <div className="border border-brick p-4 text-brick">
          Couldn&apos;t load your inquiries. Check that the backend is running.
        </div>
      )}
      {loadState === "ready" && inquiries.length === 0 && (
        <div className="border border-line-soft p-6 text-center text-ink-soft">
          You haven&apos;t sent any inquiries yet.{" "}
          <Link href="/search" className="text-brand underline">Find a place</Link>.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {inquiries.map((i) => {
          const s = STATUS_TEXT[i.status];
          return (
            <article
              key={i.id}
              className="bg-paper-raised border border-line-soft p-4"
              style={{ borderLeftWidth: "4px", borderLeftColor: s.color }}
            >
              <Link href={`/listing/${i.listing_id}`} className="font-serif text-lg hover:underline">
                {i.listing_title}
              </Link>
              <p className="text-sm font-medium mt-0.5" style={{ color: s.color }}>
                {s.label}
              </p>
              <p className="mt-3 text-sm whitespace-pre-wrap text-ink-soft">{i.message}</p>
              <p className="mt-3 text-xs text-ink-soft">
                Sent {formatDate(i.created_at)}
                {i.move_in_date && ` · Move-in ${formatDate(i.move_in_date)}`}
              </p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
