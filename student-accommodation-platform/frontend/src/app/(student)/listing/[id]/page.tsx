export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Week 3: fetch listing by id, show images, amenities, map, chat/inquiry CTA.
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Listing detail</h1>
      <p className="text-gray-500 mt-2">Listing {id} — full detail view lands in Week 3.</p>
    </main>
  );
}
