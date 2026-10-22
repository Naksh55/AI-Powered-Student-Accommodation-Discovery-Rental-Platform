"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/app/lib/api";
import { analyzeListing, saveDescription, type ListingAnalysis } from "@/app/lib/analysis-api";

function scoreStyle(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Looks complete", color: "var(--raw-brand)" };
  if (score >= 50) return { label: "Needs a few fixes", color: "var(--raw-marigold-dark)" };
  return { label: "Incomplete", color: "var(--raw-brick)" };
}

export function ListingQualityPanel({
  listingId,
  onDescriptionSaved,
}: {
  listingId: string;
  onDescriptionSaved: (description: string) => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorText, setErrorText] = useState("");
  const [analysis, setAnalysis] = useState<ListingAnalysis | null>(null);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const run = useCallback(async () => {
    setState("loading");
    setSaveState("idle");
    try {
      const result = await analyzeListing(listingId);
      setAnalysis(result);
      setDraft(result.improved_description ?? "");
      setState("ready");
    } catch (err) {
      setErrorText(
        err instanceof ApiError && err.status === 403
          ? "You can only check your own listings."
          : "Couldn't run the check. Make sure the backend is running and try again."
      );
      setState("error");
    }
  }, [listingId]);

  useEffect(() => {
    run();
  }, [run]);

  // A draft with [placeholders] still in it must never be published, so
  // saving stays disabled until the owner has replaced every bracket.
  const hasPlaceholders = /[[\]]/.test(draft);

  async function handleSave() {
    setSaveState("saving");
    try {
      await saveDescription(listingId, draft.trim());
      onDescriptionSaved(draft.trim());
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="border border-t-0 border-line-soft bg-paper p-5">
      {state === "loading" && (
        <p className="text-sm text-ink-soft">Checking your listing… this can take a few seconds.</p>
      )}

      {state === "error" && <p className="text-sm text-brick">{errorText}</p>}

      {state === "ready" && analysis && (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl" style={{ color: scoreStyle(analysis.score).color }}>
                {analysis.score}
              </span>
              <span className="text-sm text-ink-soft">/ 100 · {scoreStyle(analysis.score).label}</span>
              <button onClick={run} className="ml-auto text-sm text-brand underline">
                Check again
              </button>
            </div>
            <div className="h-1.5 bg-line-soft mt-2">
              <div
                className="h-full"
                style={{ width: `${analysis.score}%`, background: scoreStyle(analysis.score).color }}
              />
            </div>
          </div>

          {analysis.issues.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium mb-2">To fix</h4>
              <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                {analysis.issues.map((issue) => (
                  <li key={issue.code} className="pl-3 border-l-2 border-line">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Nothing missing. This listing has everything students look for.</p>
          )}

          {!analysis.ai_available && (
            <p className="text-sm text-ink-soft">
              {analysis.ai_note ?? "AI suggestions aren't available right now."}
            </p>
          )}
          {analysis.ai_available && analysis.ai_note && (
            <p className="text-sm text-brick">{analysis.ai_note}</p>
          )}

          {analysis.improved_description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Suggested description</h4>
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaveState("idle");
                }}
                rows={5}
                className="w-full border-2 border-line px-3 py-2 bg-paper-raised text-sm focus:outline-none focus:border-brand"
              />
              {hasPlaceholders && (
                <p className="text-xs text-ink-soft mt-1">
                  Replace the [bracketed] parts with real details to enable saving.
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleSave}
                  disabled={hasPlaceholders || !draft.trim() || saveState === "saving"}
                  className="bg-brand text-paper-raised px-3 py-1.5 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveState === "saving" ? "Saving…" : "Use this description"}
                </button>
                {saveState === "saved" && (
                  <span className="text-sm text-sage">Saved. Run the check again to see your new score.</span>
                )}
                {saveState === "error" && (
                  <span className="text-sm text-brick">Couldn&apos;t save. Try again.</span>
                )}
              </div>
            </div>
          )}

          {analysis.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tips for this listing</h4>
              <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                {analysis.suggestions.map((s) => (
                  <li key={s} className="pl-3 border-l-2 border-line">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
