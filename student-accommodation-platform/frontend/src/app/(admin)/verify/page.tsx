"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import { approveListing, getPendingListings, rejectListing, type AdminListing } from "@/app/lib/admin-api";
import { describeError, formatDate } from "@/app/lib/inquiries-api";
import { imageSrc } from "@/app/lib/media";
import { ROOM_TYPE_META } from "@/app/lib/room-type";
import { PriceTag } from "@/app/components/PriceTag";

export default function AdminVerifyPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signed-out") router.push("/login");
    else if (status === "signed-in" && user?.role !== "admin") router.push("/search");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "signed-in" || user?.role !== "admin") return;
    getPendingListings()
      .then((data) => {
        setListings(data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [status, user]);

  async function review(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("Hide this listing from students?")) return;
    setActionError(null);
    setBusyId(id);
    try {
      await (action === "approve" ? approveListing(id) : rejectListing(id));
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading" || status === "signed-out") {
    return <main className="max-w-3xl mx-auto p-6 md:p-10 text-ink-soft">Loading…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10">
      <h1 className="font-serif text-3xl">Listings pending verification</h1>
      <p className="text-ink-soft mt-1 mb-8">
        Check the details and photos, then approve or hide each one.
        {loadState === "ready" && listings.length > 0 && ` ${listings.length} waiting.`}
      </p>

      {actionError && <p className="text-brick text-sm mb-4">{actionError}</p>}
      {loadState === "loading" && <p className="text-ink-soft">Loading…</p>}
      {loadState === "error" && (
        <div className="border border-brick p-4 text-brick">
          Couldn&apos;t load the queue. Check that the backend is running.
        </div>
      )}
      {loadState === "ready" && listings.length === 0 && (
        <div className="border border-line-soft p-6 text-center text-ink-soft">
          Nothing to review. Every listing has been checked.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {listings.map((l) => {
          const meta = ROOM_TYPE_META[l.room_type];
          return (
            <article
              key={l.id}
              className="bg-paper-raised border border-line-soft p-4"
              style={{ borderLeftWidth: "4px", borderLeftColor: meta.edgeColor }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-ink-soft">{meta.label}</p>
                  <Link href={`/listing/${l.id}`} className="font-serif text-lg hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {l.address_line}, {l.city}
                  </p>
                </div>
                <PriceTag amount={l.monthly_rent} />
              </div>

              {l.image_urls.length > 0 ? (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {l.image_urls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={imageSrc(url)} alt="" className="h-24 w-auto border border-line-soft" />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-brick">No photos uploaded.</p>
              )}

              <p className="mt-3 text-sm whitespace-pre-wrap">
                {l.description || <span className="text-ink-soft">No description.</span>}
              </p>

              <p className="mt-3 text-xs text-ink-soft">
                Owner: {l.owner_name} ·{" "}
                <a href={`mailto:${l.owner_email}`} className="text-brand underline">
                  {l.owner_email}
                </a>{" "}
                · Submitted {formatDate(l.created_at)}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => review(l.id, "approve")}
                  disabled={busyId === l.id}
                  className="bg-brand text-paper-raised px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(l.id, "reject")}
                  disabled={busyId === l.id}
                  className="border border-brick text-brick px-4 py-2 text-sm font-medium hover:bg-brick hover:text-paper-raised transition-colors disabled:opacity-60"
                >
                  Hide
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
