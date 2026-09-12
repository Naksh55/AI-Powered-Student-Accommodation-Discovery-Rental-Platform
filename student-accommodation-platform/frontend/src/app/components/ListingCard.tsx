import Link from "next/link";
import type { ListingOut } from "@/app/lib/api";
import { ROOM_TYPE_META } from "@/app/lib/room-type";
import { PriceTag } from "./PriceTag";
import { AmenityChip } from "./AmenityChip";

export function ListingCard({ listing }: { listing: ListingOut }) {
  const roomMeta = ROOM_TYPE_META[listing.room_type];
  const previewAmenities = [
    listing.has_ac ? "AC" : null,
    listing.has_wifi ? "Wi-Fi" : null,
    listing.food_included ? "Food included" : null,
  ].filter((a): a is string => a !== null);

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group flex gap-4 bg-paper-raised border border-line-soft hover:border-line transition-colors"
      style={{ borderLeftWidth: "4px", borderLeftColor: roomMeta.edgeColor }}
    >
      <div className="w-32 h-32 shrink-0 bg-line-soft overflow-hidden">
        {listing.image_urls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_urls[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-ink-soft">
            No photo yet
          </div>
        )}
      </div>

      <div className="flex-1 py-3 pr-4 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-soft">{roomMeta.label}</p>
            <h3 className="font-serif text-lg leading-tight truncate group-hover:underline">
              {listing.title}
            </h3>
            <p className="text-sm text-ink-soft mt-0.5">{listing.city}</p>
          </div>
          <PriceTag amount={listing.monthly_rent} />
        </div>

        {previewAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {previewAmenities.map((a) => (
              <AmenityChip key={a} label={a} />
            ))}
          </div>
        )}

        {listing.is_verified && (
          <p className="text-xs text-sage mt-2 font-medium">Verified listing</p>
        )}
      </div>
    </Link>
  );
}
