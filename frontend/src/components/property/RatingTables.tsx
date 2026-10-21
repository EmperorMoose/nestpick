import { useRatings, useUpsertRating } from "@/hooks/useRatings";
import { RATING_CATEGORIES, type PropertyRating, type RatingCategory } from "@/types";

const USERS: { key: "pierce" | "rach"; label: string }[] = [
  { key: "pierce", label: "Caleb" },
  { key: "rach", label: "Kass" },
];

const CATEGORY_LABELS: Record<RatingCategory, string> = {
  layout: "Layout",
  aesthetics: "Aesthetics",
  upkeep: "Upkeep",
  yard: "Yard",
  area: "Area",
  neighborhood: "Neighborhood",
  overall: "Overall",
};

// ---------------------------------------------------------------------------
// Star component — click to set, click same star again to clear
// ---------------------------------------------------------------------------
function Stars({
  value,
  onChange,
  readonly,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={readonly}
          onClick={() => onChange?.(value === n ? null : n)}
          className={[
            "text-lg leading-none transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
            n <= (value ?? 0) ? "text-amber-400" : "text-gray-200",
          ].join(" ")}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compute average for a category across both users (null if neither has rated)
// ---------------------------------------------------------------------------
function avg(ratings: PropertyRating[], cat: RatingCategory): number | null {
  const vals = ratings.map((r) => r[cat]).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtAvg(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(1);
}

// ---------------------------------------------------------------------------
// Per-user rating column
// ---------------------------------------------------------------------------
function UserRatingColumn({
  user,
  label,
  ratings,
  propertyId,
}: {
  user: "pierce" | "rach";
  label: string;
  ratings: PropertyRating[];
  propertyId: number;
}) {
  const upsert = useUpsertRating(propertyId);
  const current = ratings.find((r) => r.user_name === user);

  function handleChange(cat: RatingCategory, val: number | null) {
    // Build the full current rating object with this one field changed
    const merged: Partial<Record<RatingCategory, number | null>> = {};
    for (const c of RATING_CATEGORIES) {
      merged[c] = c === cat ? val : (current?.[c] ?? null);
    }
    upsert.mutate({ user, ratings: merged });
  }

  return (
    <div className="flex-1 min-w-[180px]">
      <div className="text-center font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
        {label}
      </div>
      {RATING_CATEGORIES.map((cat) => (
        <div
          key={cat}
          className="flex items-center justify-center py-2 border-b border-gray-50 last:border-0"
        >
          <Stars
            value={current?.[cat] ?? null}
            onChange={(v) => handleChange(cat, v)}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function RatingTables({ propertyId }: { propertyId: number }) {
  const { data: ratings = [], isLoading } = useRatings(propertyId);

  if (isLoading) return <p className="text-sm text-gray-400 animate-pulse">Loading ratings…</p>;

  // Compute per-category averages
  const averages = Object.fromEntries(
    RATING_CATEGORIES.map((cat) => [cat, avg(ratings, cat)])
  ) as Record<RatingCategory, number | null>;

  // Overall combined average across all categories and users
  const allVals = RATING_CATEGORIES.map((c) => averages[c]).filter((v): v is number => v !== null);
  const combinedAvg = allVals.length
    ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      {/* Side-by-side rating tables + average column */}
      <div className="flex gap-4">
        {/* Category labels column */}
        <div className="w-28 shrink-0">
          <div className="text-center font-semibold text-transparent mb-3 pb-2 border-b border-gray-100 select-none">
            {/* spacer matching header height */}
            ‌
          </div>
          {RATING_CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="flex items-center py-2 border-b border-gray-50 last:border-0 text-xs font-medium text-gray-500 uppercase tracking-wide"
            >
              {CATEGORY_LABELS[cat]}
            </div>
          ))}
        </div>

        {/* Display names retain the existing storage keys to preserve saved ratings. */}
        {USERS.map(({ key, label }) => (
          <UserRatingColumn
            key={key}
            user={key}
            label={label}
            ratings={ratings}
            propertyId={propertyId}
          />
        ))}

        {/* Average column */}
        <div className="flex-1 min-w-[100px]">
          <div className="text-center font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
            Average
          </div>
          {RATING_CATEGORIES.map((cat) => {
            const v = averages[cat];
            return (
              <div
                key={cat}
                className="flex items-center justify-center py-2 border-b border-gray-50 last:border-0"
              >
                {v !== null ? (
                  <div className="flex items-center gap-1.5">
                    <Stars value={Math.round(v)} readonly />
                    <span className="text-xs text-gray-500 w-6">{fmtAvg(v)}</span>
                  </div>
                ) : (
                  <span className="text-gray-300 text-sm">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Combined score banner */}
      {combinedAvg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-800">Combined Score</span>
          <div className="flex items-center gap-2">
            <Stars value={Math.round(Number(combinedAvg))} readonly />
            <span className="text-lg font-bold text-amber-700">{combinedAvg} / 5</span>
          </div>
        </div>
      )}
    </div>
  );
}
