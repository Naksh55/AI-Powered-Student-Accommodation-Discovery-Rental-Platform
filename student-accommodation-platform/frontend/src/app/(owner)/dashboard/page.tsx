"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import { getMyListings, deleteListing, type ListingOut } from "@/app/lib/api";
import { ROOM_TYPE_META } from "@/app/lib/room-type";
import { PriceTag } from "@/app/components/PriceTag";

export default function OwnerDashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<ListingOut[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  // Auth guard: redirect anyone who isn't a signed-in owner. We wait for
  // "signed-out" specifically (not just "not signed-in") so we don't bounce
  // people during the brief moment auth status is still loading.
  useEffect(() => {
    if (status === "signed-out") {
      router.push("/login");
    } else if (status === "signed-in" && user?.role !== "owner") {
      router.push("/search");
    }
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "signed-in" || user?.role !== "owner") return;
    getMyListings()
      .then((data) => {
        setListings(data);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [status, user]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing? This can't be undone.")) return;
    await deleteListing(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  if (status === "loading" || status === "signed-out") {
    return <main className="max-w-3xl mx-auto p-6 md:p-10 text-ink-soft">Loading…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl">Your listings</h1>
          <p className="text-ink-soft mt-1">Manage the properties you've posted.</p>
        </div>
        <Link
          href="/listings/new"
          className="bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors whitespace-nowrap"
        >
          + New listing
        </Link>
      </div>

      {loadState === "loading" && <p className="text-ink-soft">Loading your listings…</p>}

      {loadState === "error" && (
        <div className="border border-brick p-4 text-brick">
          Couldn&apos;t load your listings. Check that the backend is running.
        </div>
      )}

      {loadState === "ready" && listings.length === 0 && (
        <div className="border border-line-soft p-6 text-center text-ink-soft">
          You haven&apos;t listed a property yet.{" "}
          <Link href="/listings/new" className="text-brand underline">
            Create your first listing
          </Link>
          .
        </div>
      )}

      {loadState === "ready" && listings.length > 0 && (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => {
            const roomMeta = ROOM_TYPE_META[listing.room_type];
            return (
              <div
                key={listing.id}
                className="flex items-center justify-between gap-4 bg-paper-raised border border-line-soft p-4"
                style={{ borderLeftWidth: "4px", borderLeftColor: roomMeta.edgeColor }}
              >
                <div className="min-w-0">
                  <p className="text-xs text-ink-soft">
                    {roomMeta.label}
                    {!listing.is_verified && " · Pending verification"}
                  </p>
                  <h3 className="font-serif text-lg truncate">{listing.title}</h3>
                  <p className="text-sm text-ink-soft">{listing.city}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <PriceTag amount={listing.monthly_rent} />
                  <Link
                    href={`/listing/${listing.id}`}
                    className="text-sm text-brand underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="text-sm text-brick underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
