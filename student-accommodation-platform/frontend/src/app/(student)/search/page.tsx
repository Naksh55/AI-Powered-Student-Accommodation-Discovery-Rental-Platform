"use client";

import { useEffect, useState } from "react";
import {
  getColleges,
  getListings,
  type College,
  type ListingFilters,
  type ListingOut,
} from "@/app/lib/api";
import { SearchFilterForm } from "@/app/components/SearchFilterForm";
import { NaturalLanguageSearchBox } from "@/app/components/NaturalLanguageSearchBox";
import { ListingCard } from "@/app/components/ListingCard";

const COLLEGE_KEY = "accommodation_platform_college";

export default function SearchPage() {
  const [listings, setListings] = useState<ListingOut[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState("");

  async function runSearch(filters: ListingFilters = {}) {
    setStatus("loading");
    try {
      setListings(await getListings(filters));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  function handleNaturalLanguageResults(results: ListingOut[] | null) {
    if (results === null) return; // an error occurred; keep the current results
    setListings(results);
    setStatus("ready");
  }

  function handleCollegeChange(id: string) {
    setCollegeId(id);
    // Remember the choice so a student doesn't have to pick it every visit.
    try {
      if (id) window.localStorage.setItem(COLLEGE_KEY, id);
      else window.localStorage.removeItem(COLLEGE_KEY);
    } catch {
      /* storage unavailable: the selection just won't persist */
    }
  }

  useEffect(() => {
    runSearch();
    getColleges()
      .then((list) => {
        setColleges(list);
        try {
          const saved = window.localStorage.getItem(COLLEGE_KEY);
          if (saved && list.some((c) => c.id === saved)) setCollegeId(saved);
        } catch {
          /* ignore */
        }
      })
      .catch(() => setColleges([]));
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10">
      <h1 className="font-serif text-3xl">Find a place near your college</h1>
      <p className="text-ink-soft mt-1 mb-6">
        Filter by budget, room type, distance, and what matters to you.
      </p>

      <NaturalLanguageSearchBox collegeId={collegeId} onResults={handleNaturalLanguageResults} />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
        <SearchFilterForm
          onSearch={runSearch}
          colleges={colleges}
          collegeId={collegeId}
          onCollegeChange={handleCollegeChange}
        />

        <div className="flex flex-col gap-4">
          {status === "loading" && <p className="text-ink-soft">Loading listings…</p>}

          {status === "error" && (
            <div className="border border-brick p-4 text-brick">
              Couldn&apos;t reach the server. Check that the backend is running on
              localhost:8000 and try again.
            </div>
          )}

          {status === "ready" && listings.length === 0 && (
            <div className="border border-line-soft p-6 text-center text-ink-soft">
              No listings match those filters yet. Try a wider distance or budget,
              or drop a filter.
            </div>
          )}

          {status === "ready" &&
            listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      </div>
    </main>
  );
}
