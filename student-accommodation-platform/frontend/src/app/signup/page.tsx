"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import type { UserRole } from "@/app/lib/api";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ full_name: fullName, email, password, role });
      router.push(role === "owner" ? "/dashboard" : "/search");
    } catch {
      setError("Couldn't create that account. The email may already be in use.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6 md:p-10">
      <h1 className="font-serif text-2xl mb-6">Sign up</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="full_name">
            Full name
          </label>
          <input
            id="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1" htmlFor="role">
            I am a
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          >
            <option value="student">Student — looking for a place</option>
            <option value="owner">Owner — listing a property</option>
          </select>
        </div>

        {error && <p className="text-brick text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-ink-soft mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-brand underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
