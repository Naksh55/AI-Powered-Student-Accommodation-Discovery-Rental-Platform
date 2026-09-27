"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";
import { ApiError } from "@/app/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect email or password."
          : "Couldn't reach the server. Check that the backend is running."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6 md:p-10">
      <h1 className="font-serif text-2xl mb-6">Log in</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-line px-3 py-2 bg-paper focus:outline-none focus:border-brand"
          />
        </div>

        {error && <p className="text-brick text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-paper-raised px-4 py-2.5 font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-ink-soft mt-4">
        No account yet?{" "}
        <Link href="/signup" className="text-brand underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
