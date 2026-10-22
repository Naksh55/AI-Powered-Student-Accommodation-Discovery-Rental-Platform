"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import type { ListingOut } from "@/app/lib/api";
import { describeError, sendInquiry } from "@/app/lib/inquiries-api";

const FIELD =
  "w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InquiryForm({ listing }: { listing: ListingOut }) {
  const { user, status } = useAuth();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [moveIn, setMoveIn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const box = "border-t border-line-soft pt-6";

  if (status === "loading") return <div className={box} />;

  if (status === "signed-out") {
    return (
      <div className={box}>
        <h2 className="font-serif text-xl mb-2">Interested in this place?</h2>
        <p className="text-ink-soft text-sm">
          <Link href="/login" className="text-brand underline">Log in</Link> or{" "}
          <Link href="/signup" className="text-brand underline">sign up</Link> as a
          student to send the owner an inquiry.
        </p>
      </div>
    );
  }

  if (user?.id === listing.owner_id) {
    return (
      <div className={box}>
        <p className="text-ink-soft text-sm">
          This is your listing. Inquiries from students appear under{" "}
          <Link href="/inquiries" className="text-brand underline">Inquiries</Link>.
        </p>
      </div>
    );
  }

  if (user?.role !== "student") {
    return (
      <div className={box}>
        <p className="text-ink-soft text-sm">Only student accounts can send inquiries.</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className={box}>
        <h2 className="font-serif text-xl mb-2">Inquiry sent</h2>
        <p className="text-ink-soft text-sm">
          The owner can now see your message, name, email and phone number. Track
          the reply status under{" "}
          <Link href="/my-inquiries" className="text-brand underline">My inquiries</Link>.
        </p>
      </div>
    );
  }

  // Prefill the phone from the student's profile until they type their own.
  const phoneValue = phoneEdited ? phone : (user?.phone_number ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendInquiry({
        listing_id: listing.id,
        message,
        contact_phone: phoneValue.trim() || undefined,
        move_in_date: moveIn || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={box}>
      <h2 className="font-serif text-xl mb-1">Message the owner</h2>
      <p className="text-ink-soft text-sm mb-4">
        The owner will see your name, email and phone number along with your message.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="inquiry-message">
            Your message
          </label>
          <textarea
            id="inquiry-message"
            required
            minLength={10}
            maxLength={1000}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Is this still available? When can I come to see it?"
            className={FIELD}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1" htmlFor="inquiry-phone">
              Phone (optional)
            </label>
            <input
              id="inquiry-phone"
              type="tel"
              value={phoneValue}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneEdited(true);
              }}
              className={FIELD}
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1" htmlFor="inquiry-movein">
              Move-in date (optional)
            </label>
            <input
              id="inquiry-movein"
              type="date"
              min={todayLocal()}
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        {error && <p className="text-brick text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send inquiry"}
        </button>
      </form>
    </div>
  );
}
