"use client";

import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";

export function SiteHeader() {
  const { user, status, logout } = useAuth();

  return (
    <header className="border-b border-line-soft bg-paper-raised">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg">
          Student Accommodation
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/search" className="hover:underline">
            Search
          </Link>

          {status === "signed-in" && user?.role === "owner" && (
            <Link href="/dashboard" className="hover:underline">
              My listings
            </Link>
          )}

          {status === "signed-out" && (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-brand text-paper-raised px-3 py-1.5 hover:bg-brand-dark transition-colors"
              >
                Sign up
              </Link>
            </>
          )}

          {status === "signed-in" && (
            <button onClick={logout} className="text-ink-soft hover:underline">
              Log out ({user?.full_name})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
