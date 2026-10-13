"use client";

import { useState } from "react";
import {
  ApiError,
  naturalLanguageSearch,
  type ListingOut,
  type NaturalLanguageSearchResult,
} from "@/app/lib/api";
import { ROOM_TYPE_META } from "@/app/lib/room-type";

function describe(result: NaturalLanguageSearchResult): string[] {
  const f = result.parsed_filters;
  const parts: string[] = [];
  if (f.room_type) parts.push(ROOM_TYPE_META[f.room_type].label);
  if (f.max_budget && f.min_budget) {
    parts.push(`₹${f.min_budget.toLocaleString("en-IN")}–₹${f.max_budget.toLocaleString("en-IN")}`);
  } else if (f.max_budget) {
    parts.push(`under ₹${f.max_budget.toLocaleString("en-IN")}`);
  } else if (f.min_budget) {
    parts.push(`over ₹${f.min_budget.toLocaleString("en-IN")}`);
  }
  if (f.has_ac) parts.push("AC");
  if (f.has_wifi) parts.push("Wi-Fi");
  if (f.food_included) parts.push("food included");

  // Show the distance only if it was really applied, and say what it was
  // measured from, so a wrong guess about the college is visible.
  if (result.college && result.applied_radius_km) {
    parts.push(`within ${result.applied_radius_km} km of ${result.college.name}`);
  } else if (f.max_distance_km) {
    parts.push(`within ${f.max_distance_km} km (choose your college to apply this)`);
  }

  // When a college was matched, the city is covered by the radius search.
  if (f.city && !result.college) parts.push(`in ${f.city}`);
  return parts;
}

export function NaturalLanguageSearchBox({
  collegeId,
  onResults,
}: {
  collegeId: string;
  onResults: (results: ListingOut[] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "unconfigured" | "error">("idle");
  const [understood, setUnderstood] = useState<NaturalLanguageSearchResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setState("loading");
    try {
      const result = await naturalLanguageSearch(query, collegeId || null);
      setUnderstood(result);
      setState("done");
      onResults(result.results);
    } catch (err) {
      setState(err instanceof ApiError && err.status === 503 ? "unconfigured" : "error");
      onResults(null);
    }
  }

  return (
    <div className="bg-paper-raised border border-line-soft p-5 mb-6">
      <label className="block text-sm text-ink-soft mb-2" htmlFor="nl-query">
        Or just describe what you&apos;re looking for
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="nl-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Single room under ₹8,000 near CGC Landran with AC"
          className="flex-1 border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-marigold text-ink px-4 py-2 font-medium hover:bg-marigold-dark transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {state === "loading" ? "Thinking…" : "Ask"}
        </button>
      </form>

      {state === "unconfigured" && (
        <p className="text-sm text-brick mt-3">
          Natural-language search isn&apos;t set up yet. Add your LLM API key to
          backend/.env to enable it. The filters below still work.
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-brick mt-3">
          Couldn&apos;t understand that query. Try rephrasing, or use the filters.
        </p>
      )}

      {state === "done" && understood && (
        <p className="text-sm text-ink-soft mt-3">
          Searching for:{" "}
          <span className="text-ink font-medium">
            {describe(understood).join(", ") || "no specific filters understood"}
          </span>
        </p>
      )}
    </div>
  );
}
