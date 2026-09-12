"use client";

import { useState } from "react";
import type { ListingFilters } from "@/app/lib/api";

const ROOM_TYPE_OPTIONS: { value: ListingFilters["room_type"]; label: string }[] = [
  { value: undefined, label: "Any room type" },
  { value: "single", label: "Single room" },
  { value: "shared_2", label: "Shared (2)" },
  { value: "shared_3_plus", label: "Shared (3+)" },
  { value: "flat", label: "Full flat" },
];

export function SearchFilterForm({
  onSearch,
}: {
  onSearch: (filters: ListingFilters) => void;
}) {
  const [maxBudget, setMaxBudget] = useState("");
  const [roomType, setRoomType] = useState<ListingFilters["room_type"]>(undefined);
  const [hasAc, setHasAc] = useState(false);
  const [hasWifi, setHasWifi] = useState(false);
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [city, setCity] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      max_budget: maxBudget ? Number(maxBudget) : undefined,
      room_type: roomType,
      has_ac: hasAc || undefined,
      has_wifi: hasWifi || undefined,
      food_included: foodIncluded || undefined,
      city: city || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-paper-raised border border-line-soft p-5 flex flex-col gap-4"
    >
      <div>
        <label className="block text-sm text-ink-soft mb-1" htmlFor="city">
          City or area
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Mohali"
          className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1" htmlFor="max-budget">
          Max monthly rent (₹)
        </label>
        <input
          id="max-budget"
          type="number"
          min={0}
          value={maxBudget}
          onChange={(e) => setMaxBudget(e.target.value)}
          placeholder="8000"
          className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1" htmlFor="room-type">
          Room type
        </label>
        <select
          id="room-type"
          value={roomType ?? ""}
          onChange={(e) =>
            setRoomType(
              (e.target.value || undefined) as ListingFilters["room_type"]
            )
          }
          className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
        >
          {ROOM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-ink-soft mb-1">Must have</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasAc} onChange={(e) => setHasAc(e.target.checked)} />
          AC
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasWifi} onChange={(e) => setHasWifi(e.target.checked)} />
          Wi-Fi
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={foodIncluded}
            onChange={(e) => setFoodIncluded(e.target.checked)}
          />
          Food included
        </label>
      </fieldset>

      <button
        type="submit"
        className="bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors"
      >
        Search
      </button>
    </form>
  );
}
