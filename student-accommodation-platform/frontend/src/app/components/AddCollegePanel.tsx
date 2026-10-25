"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import type { College } from "@/app/lib/api";
import { addCollege, searchPlaces, type PlaceResult } from "@/app/lib/colleges-api";
import { describeError } from "@/app/lib/inquiries-api";

const FIELD =
  "w-full border-2 border-line px-2 py-1.5 text-sm bg-paper focus:outline-none focus:border-brand";

// This panel sits INSIDE the search filter <form>, so it must not contain a
// <form> of its own (nested forms are invalid HTML), every button needs
// type="button" (the default would submit the filters), and Enter in its text
// boxes is handled by hand.
export function AddCollegePanel({ onAdded }: { onAdded: (college: College) => void }) {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState("");
  const [mCity, setMCity] = useState("");
  const [mCoords, setMCoords] = useState("");
  const lastSearch = useRef(0);

  function reset() {
    setOpen(false);
    setQuery("");
    setResults(null);
    setSearchError(null);
    setAddError(null);
    setManualOpen(false);
    setMName("");
    setMCity("");
    setMCoords("");
  }

  async function find() {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    setAddError(null);
    setResults(null);
    // The map service allows 1 request per second; space searches out.
    const wait = 1100 - (Date.now() - lastSearch.current);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSearch.current = Date.now();
    try {
      setResults(await searchPlaces(query.trim()));
    } catch {
      setSearchError("Couldn't reach the map search. You can enter your college by hand below.");
      setManualOpen(true);
    } finally {
      setSearching(false);
    }
  }

  async function save(input: { name: string; city?: string; latitude: number; longitude: number }) {
    setAdding(true);
    setAddError(null);
    try {
      const college = await addCollege(input);
      onAdded(college);
      reset();
    } catch (err) {
      setAddError(describeError(err));
    } finally {
      setAdding(false);
    }
  }

  function saveManual() {
    const m = mCoords.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
    if (mName.trim().length < 3) return setAddError("Enter the college's name.");
    if (!m) return setAddError("Enter the coordinates as two numbers, like 30.6865, 76.6647.");
    save({
      name: mName.trim(),
      city: mCity.trim() || undefined,
      latitude: Number(m[1]),
      longitude: Number(m[2]),
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-brand underline text-left -mt-2"
      >
        My college isn&apos;t listed
      </button>
    );
  }

  if (status !== "signed-in") {
    return (
      <div className="text-sm text-ink-soft -mt-2">
        <Link href="/login" className="text-brand underline">Log in</Link> to add your college, so
        other students from it can find it too.{" "}
        <button type="button" onClick={reset} className="underline">Cancel</button>
      </div>
    );
  }

  return (
    <div className="border border-line-soft bg-paper p-3 flex flex-col gap-2 -mt-2">
      <label className="text-sm text-ink-soft" htmlFor="college-search">
        Search for your college
      </label>
      <div className="flex gap-2">
        <input
          id="college-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // don't submit the filters behind this panel
              find();
            }
          }}
          placeholder="Full name and city"
          className={FIELD}
        />
        <button
          type="button"
          onClick={find}
          disabled={searching || !query.trim()}
          className="bg-brand text-paper-raised px-3 text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
        >
          {searching ? "…" : "Find"}
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        e.g. Lovely Professional University Phagwara. Press Find, results don&apos;t appear as you type.
      </p>

      {searchError && <p className="text-xs text-brick">{searchError}</p>}

      {results && results.length === 0 && (
        <p className="text-xs text-ink-soft">
          No places found. Try the full name with the city, or enter it by hand below.
        </p>
      )}

      {results && results.length > 0 && (
        <>
          <ul className="flex flex-col gap-1.5">
            {results.map((p) => (
              <li key={p.key} className="border border-line-soft bg-paper-raised p-2">
                <p className="text-sm font-medium leading-snug">{p.name}</p>
                <p className="text-xs text-ink-soft leading-snug">{p.label}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-ink-soft">{p.kind}</span>
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() =>
                      save({ name: p.name, city: p.city, latitude: p.latitude, longitude: p.longitude })
                    }
                    className="text-xs text-brand underline disabled:opacity-60"
                  >
                    {adding ? "Adding…" : "Use this"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-soft">Results © OpenStreetMap contributors</p>
        </>
      )}

      {addError && <p className="text-xs text-brick">{addError}</p>}

      <button
        type="button"
        onClick={() => setManualOpen((v) => !v)}
        className="text-xs text-ink-soft underline text-left"
      >
        {manualOpen ? "Hide manual entry" : "Can't find it? Enter it by hand"}
      </button>

      {manualOpen && (
        <div className="flex flex-col gap-2">
          <input
            value={mName}
            onChange={(e) => setMName(e.target.value)}
            placeholder="College name"
            className={FIELD}
            aria-label="College name"
          />
          <input
            value={mCity}
            onChange={(e) => setMCity(e.target.value)}
            placeholder="City"
            className={FIELD}
            aria-label="City"
          />
          <input
            value={mCoords}
            onChange={(e) => setMCoords(e.target.value)}
            placeholder="Coordinates, e.g. 30.6865, 76.6647"
            className={FIELD}
            aria-label="Coordinates"
          />
          <p className="text-xs text-ink-soft">
            In Google Maps, right-click the campus gate and click the numbers to copy them.
          </p>
          <button
            type="button"
            onClick={saveManual}
            disabled={adding}
            className="self-start bg-brand text-paper-raised px-3 py-1.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add college"}
          </button>
        </div>
      )}

      <button type="button" onClick={reset} className="text-xs text-ink-soft underline text-left">
        Cancel
      </button>
    </div>
  );
}
