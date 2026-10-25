"use client";

import { useState } from "react";
import type { College, ListingFilters } from "@/app/lib/api";
import { AddCollegePanel } from "@/app/components/AddCollegePanel";

const ROOM_TYPE_OPTIONS: { value: ListingFilters["room_type"]; label: string }[] = [
  { value: undefined, label: "Any room type" },
  { value: "single", label: "Single room" },
  { value: "shared_2", label: "Shared (2)" },
  { value: "shared_3_plus", label: "Shared (3+)" },
  { value: "flat", label: "Full flat" },
];

const DISTANCE_OPTIONS_KM = [1, 2, 3, 5];

const FIELD =
  "w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand";

export function SearchFilterForm({
  onSearch,
  colleges,
  collegeId,
  onCollegeChange,
  onCollegeAdded,
}: {
  onSearch: (filters: ListingFilters) => void;
  colleges: College[];
  // Owned by the search page so the natural-language box can use the same
  // college. "" means no college selected.
  collegeId: string;
  onCollegeChange: (id: string) => void;
  // Called when the student adds a college that wasn't in the list.
  onCollegeAdded: (college: College) => void;
}) {
  const [maxBudget, setMaxBudget] = useState("");
  const [roomType, setRoomType] = useState<ListingFilters["room_type"]>(undefined);
  const [hasAc, setHasAc] = useState(false);
  const [hasWifi, setHasWifi] = useState(false);
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [city, setCity] = useState("");
  const [distanceKm, setDistanceKm] = useState(3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      max_budget: maxBudget ? Number(maxBudget) : undefined,
      room_type: roomType,
      has_ac: hasAc || undefined,
      has_wifi: hasWifi || undefined,
      food_included: foodIncluded || undefined,
      city: city || undefined,
      // The backend turns college_id into coordinates, so only the id and
      // the radius travel from here.
      college_id: collegeId || undefined,
      max_distance_km: collegeId ? distanceKm : undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-paper-raised border border-line-soft p-5 flex flex-col gap-4"
    >
      <div>
        <label className="block text-sm text-ink-soft mb-1" htmlFor="college">
          Near my college
        </label>
        <select
          id="college"
          value={collegeId}
          onChange={(e) => onCollegeChange(e.target.value)}
          className={FIELD}
        >
          <option value="">Anywhere</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {colleges.length === 0 && (
          <p className="text-xs text-ink-soft mt-1">No colleges loaded yet. Add yours below.</p>
        )}
      </div>

      <AddCollegePanel onAdded={onCollegeAdded} />

      {collegeId && (
        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="distance">
            Within
          </label>
          <select
            id="distance"
            value={distanceKm}
            onChange={(e) => setDistanceKm(Number(e.target.value))}
            className={FIELD}
          >
            {DISTANCE_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </div>
      )}

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
          className={FIELD}
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
          className={FIELD}
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
            setRoomType((e.target.value || undefined) as ListingFilters["room_type"])
          }
          className={FIELD}
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
