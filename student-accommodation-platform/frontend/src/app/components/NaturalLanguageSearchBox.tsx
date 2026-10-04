"use client";

import { useState } from "react";
import { ApiError, naturalLanguageSearch, type ListingOut, type ParsedSearchFilters } from "@/app/lib/api";
import { ROOM_TYPE_META } from "@/app/lib/room-type";

function describeFilters(f: ParsedSearchFilters): string[] {
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
  if (f.city) parts.push(`in ${f.city}`);
  if (f.max_distance_km) {
    parts.push(`within ${f.max_distance_km} km (not yet applied — see note below)`);
  }
  return parts;
}

export function NaturalLanguageSearchBox({
  onResults,
}: {
  // Reports both what the AI understood and the matching listings in one
  // call, so the parent search page can swap its results list and show
  // the "searching for..." confirmation in sync. null/null clears both.
  onResults: (filters: ParsedSearchFilters | null, results: ListingOut[] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "unconfigured" | "error">("idle");
  const [understood, setUnderstood] = useState<ParsedSearchFilters | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setState("loading");
    try {
      const result = await naturalLanguageSearch(query);
      setUnderstood(result.parsed_filters);
      setState("done");
      onResults(result.parsed_filters, result.results);
    } catch (err) {
      setState(err instanceof ApiError && err.status === 503 ? "unconfigured" : "error");
      onResults(null, null);
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
          placeholder="Single room under ₹8,000 with AC and Wi-Fi"
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
          Natural-language search isn&apos;t set up yet — add an OPENAI_API_KEY
          to backend/.env to enable it. The filters below still work.
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
            {describeFilters(understood).join(", ") || "no specific filters understood"}
          </span>
        </p>
      )}
    </div>
  );
}
