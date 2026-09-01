import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold text-center">
        Student Accommodation Platform
      </h1>
      <p className="text-gray-500 text-center max-w-md">
        Find PGs, flats, and rental rooms near your college — no brokers, no
        wasted visits.
      </p>
      <div className="flex gap-4">
        <Link href="/search" className="px-4 py-2 rounded bg-black text-white">
          Search as a student
        </Link>
        <Link href="/dashboard" className="px-4 py-2 rounded border border-black">
          List a property
        </Link>
      </div>
    </main>
  );
}
