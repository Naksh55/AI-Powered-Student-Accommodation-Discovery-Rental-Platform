"use client";

import { useRef, useState } from "react";
import { uploadListingImage } from "@/app/lib/api";

export function AddPhotosButton({
  listingId,
  onUploaded,
}: {
  listingId: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // so picking the same file again still fires onChange
    if (files.length === 0) return;

    setUploading(true);
    setNote(null);
    let done = 0;
    const failed: string[] = [];
    for (const file of files) {
      try {
        await uploadListingImage(listingId, file);
        done += 1;
      } catch {
        failed.push(file.name);
      }
    }
    setUploading(false);

    if (failed.length > 0) {
      setNote({
        text: `Couldn't upload ${failed.join(", ")}. Photos must be JPEG, PNG or WebP, up to 5 MB.`,
        isError: true,
      });
    } else {
      setNote({ text: `${done} photo${done === 1 ? "" : "s"} added`, isError: false });
    }
    if (done > 0) onUploaded();
  }

  return (
    <span className="inline-flex flex-col">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm text-brand underline text-left disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Add photos"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
      {note && (
        <span className={`text-xs mt-1 ${note.isError ? "text-brick" : "text-sage"}`}>{note.text}</span>
      )}
    </span>
  );
}
