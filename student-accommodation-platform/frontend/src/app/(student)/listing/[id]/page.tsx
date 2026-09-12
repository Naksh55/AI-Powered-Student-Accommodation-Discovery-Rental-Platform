"use client";

import { useEffect, useState, use } from "react";
import { getListing, type ListingOut } from "@/app/lib/api";
import { ROOM_TYPE_META } from "@/app/lib/room-type";
import { PriceTag } from "@/app/components/PriceTag";
import { AmenityChip } from "@/app/components/AmenityChip";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [listing, setListing] = useState<ListingOut | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    getListing(id)
      .then((data) => {
        setListing(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading") {
    return <main className="max-w-3xl mx-auto p-6 md:p-10 text-ink-soft">Loading listing…</main>;
  }

  if (status === "error" || !listing) {
    return (
      <main className="max-w-3xl mx-auto p-6 md:p-10">
        <div className="border border-brick p-4 text-brick">
          This listing couldn&apos;t be loaded. It may have been removed, or
          the server isn&apos;t reachable.
        </div>
      </main>
    );
  }

  const roomMeta = ROOM_TYPE_META[listing.room_type];
  const amenities = [
    listing.has_ac ? "AC" : null,
    listing.has_wifi ? "Wi-Fi" : null,
    listing.food_included ? "Food included" : null,
    ...listing.amenities,
  ].filter((a): a is string => Boolean(a));

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;

  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10">
      {listing.image_urls.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto mb-6">
          {listing.image_urls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={listing.title}
              className="h-64 w-auto object-cover shrink-0 border border-line-soft"
            />
          ))}
        </div>
      ) : (
        <div className="h-64 bg-line-soft flex items-center justify-center text-ink-soft mb-6">
          No photos yet
        </div>
      )}

      <div
        className="pl-4 mb-6"
        style={{ borderLeftWidth: "4px", borderLeftColor: roomMeta.edgeColor }}
      >
        <p className="text-sm text-ink-soft">{roomMeta.label}</p>
        <h1 className="font-serif text-3xl leading-tight">{listing.title}</h1>
        <p className="text-ink-soft mt-1">{listing.address_line}, {listing.city}</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <PriceTag amount={listing.monthly_rent} />
        {listing.is_verified && (
          <span className="text-sm text-sage font-medium">Verified listing</span>
        )}
      </div>

      {listing.description && (
        <p className="text-ink leading-relaxed mb-6">{listing.description}</p>
      )}

      {amenities.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-ink-soft mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <AmenityChip key={a} label={a} />
            ))}
          </div>
        </div>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block border border-brand text-brand px-4 py-2.5 font-medium hover:bg-brand hover:text-paper-raised transition-colors mb-8"
      >
        Open location in Google Maps
      </a>

      <div className="border-t border-line-soft pt-6">
        <button
          disabled
          className="bg-line text-ink-soft px-4 py-2.5 font-medium cursor-not-allowed"
          title="Chat and inquiries are built in Milestone 3"
        >
          Message owner (coming soon)
        </button>
      </div>
    </main>
  );
}
