"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { createListing, uploadListingImage, type ListingOut } from "@/app/lib/api";

export default function NewListingPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") router.push("/login");
    else if (status === "signed-in" && user?.role !== "owner") router.push("/search");
  }, [status, user, router]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState<ListingOut["room_type"]>("single");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [hasAc, setHasAc] = useState(false);
  const [hasWifi, setHasWifi] = useState(false);
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Once the listing is created we switch into "add photos" mode rather
  // than navigating away immediately — photos are optional but easiest to
  // add right after creation while the owner is already in the flow.
  const [createdListing, setCreatedListing] = useState<ListingOut | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Kept in sync with the flag-derived labels on the listing detail
      // page (Wi-Fi / Food included) so the same amenity never shows up
      // twice under two slightly different spellings.
      const amenity_names = [
        hasAc ? "AC" : null,
        hasWifi ? "Wi-Fi" : null,
        foodIncluded ? "Food included" : null,
      ].filter((a): a is string => a !== null);

      const listing = await createListing({
        title,
        description: description || undefined,
        room_type: roomType,
        monthly_rent: Number(monthlyRent),
        has_ac: hasAc,
        has_wifi: hasWifi,
        food_included: foodIncluded,
        address_line: addressLine,
        city,
        latitude: Number(latitude),
        longitude: Number(longitude),
        amenity_names,
      });
      setCreatedListing(listing);
    } catch {
      setError("Couldn't create the listing. Check that every field is filled in correctly.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!createdListing || !e.target.files?.length) return;
    for (const file of Array.from(e.target.files)) {
      await uploadListingImage(createdListing.id, file);
      setUploadedCount((c) => c + 1);
    }
  }

  if (status === "loading" || status === "signed-out") {
    return <main className="max-w-xl mx-auto p-6 md:p-10 text-ink-soft">Loading…</main>;
  }

  // Step 2: listing created, now optionally add photos.
  if (createdListing) {
    return (
      <main className="max-w-xl mx-auto p-6 md:p-10">
        <h1 className="font-serif text-2xl mb-2">Listing created</h1>
        <p className="text-ink-soft mb-6">
          &quot;{createdListing.title}&quot; is live. Add a few photos now, or skip and add them later.
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePhotoUpload}
          className="mb-4"
        />
        {uploadedCount > 0 && (
          <p className="text-sage text-sm mb-4">{uploadedCount} photo(s) uploaded.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors"
          >
            Done — go to my listings
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6 md:p-10">
      <h1 className="font-serif text-2xl mb-6">List a property</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunny single room near Sector 26"
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1" htmlFor="room_type">
              Room type
            </label>
            <select
              id="room_type"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as ListingOut["room_type"])}
              className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
            >
              <option value="single">Single room</option>
              <option value="shared_2">Shared (2)</option>
              <option value="shared_3_plus">Shared (3+)</option>
              <option value="flat">Full flat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1" htmlFor="monthly_rent">
              Monthly rent (₹)
            </label>
            <input
              id="monthly_rent"
              type="number"
              min={0}
              required
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <fieldset className="flex gap-4">
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

        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="address_line">
            Address
          </label>
          <input
            id="address_line"
            required
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="city">
            City
          </label>
          <input
            id="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1" htmlFor="latitude">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="30.7046"
              className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1" htmlFor="longitude">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="76.7179"
              className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
            />
          </div>
        </div>
        <p className="text-xs text-ink-soft -mt-2">
          Tip: right-click your building on Google Maps and click the
          coordinates to copy them.
        </p>

        {error && <p className="text-brick text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create listing"}
        </button>
      </form>
    </main>
  );
}
