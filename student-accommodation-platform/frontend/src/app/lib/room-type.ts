import type { ListingOut } from "@/app/lib/api";

// Each room type gets its own edge color + label — used as a left-border
// accent on cards rather than a decorative badge, so it carries information
// (what kind of room this is) at a glance.
export const ROOM_TYPE_META: Record<
  ListingOut["room_type"],
  { label: string; edgeColor: string }
> = {
  single: { label: "Single room", edgeColor: "#2F6F5E" },
  shared_2: { label: "Shared (2)", edgeColor: "#7BA88C" },
  shared_3_plus: { label: "Shared (3+)", edgeColor: "#D9A441" },
  flat: { label: "Full flat", edgeColor: "#B85C4A" },
};
