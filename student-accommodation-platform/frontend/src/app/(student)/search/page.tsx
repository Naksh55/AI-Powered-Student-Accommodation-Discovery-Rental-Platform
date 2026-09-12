"use client";

import { useEffect, useState } from "react";
import { getListings, type ListingFilters, type ListingOut } from "@/app/lib/api";
import { SearchFilterForm } from "@/app/components/SearchFilterForm";
import { ListingCard } from "@/app/components/ListingCard";

export default function SearchPage() {
  const [listings, setListings] = useState<ListingOut[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  async function runSearch(filters: ListingFilters = {}) {
    setStatus("loading");
    try {
      const results = await getListings(filters);
      setListings(results);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    runSearch();
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10">
      <h1 className="font-serif text-3xl">Find a place near your college</h1>
      <p className="text-ink-soft mt-1 mb-8">
        Filter by budget, room type, and what matters to you.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
        <SearchFilterForm onSearch={runSearch} />

        <div className="flex flex-col gap-4">
          {status === "loading" && (
            <p className="text-ink-soft">Loading listings…</p>
          )}

          {status === "error" && (
            <div className="border border-brick p-4 text-brick">
              Couldn&apos;t reach the server. Check that the backend is
              running on localhost:8000 and try again.
            </div>
          )}

          {status === "ready" && listings.length === 0 && (
            <div className="border border-line-soft p-6 text-center text-ink-soft">
              No listings match those filters yet. Try widening your budget
              or dropping a filter.
            </div>
          )}

          {status === "ready" &&
            listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
        </div>
      </div>
    </main>
  );
}
