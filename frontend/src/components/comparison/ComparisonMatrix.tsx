import { useComparisonMatrix, useRemoveFromComparison } from "@/hooks/useComparison";
import type { ComparisonMatrixRow } from "@/types";
import { X } from "lucide-react";

interface Props {
  comparisonId: number;
}

/**
 * Format a numeric delta so it visually matches the display string's unit.
 * e.g. "$450,000" → "+$12,000"   "85" (score) → "+3"   "1.2%" → "+0.4%"
 */
function formatDelta(delta: number, sampleDisplay: string): string {
  const sign = delta >= 0 ? "+" : "−";
  const abs = Math.abs(delta);

  if (sampleDisplay.includes("$") && sampleDisplay.includes("/mo"))
    return `${sign}$${Math.round(abs).toLocaleString()}/mo`;

  if (sampleDisplay.includes("$") && sampleDisplay.includes("/sqft"))
    return `${sign}$${Math.round(abs)}/sqft`;

  if (sampleDisplay.startsWith("$"))
    return `${sign}$${Math.round(abs).toLocaleString()}`;

  if (sampleDisplay.endsWith("%"))
    return `${sign}${abs.toFixed(1)}%`;

  if (sampleDisplay.includes("sqft"))
    return `${sign}${Math.round(abs).toLocaleString()} sqft`;

  if (sampleDisplay.includes("days"))
    return `${sign}${Math.round(abs)} days`;

  // Plain number (scores, beds, baths, year built, crimes, etc.)
  return `${sign}${Math.round(abs).toLocaleString()}`;
}

/**
 * Compute and format the delta for a given column vs the first (reference) column.
 * Returns null when delta is unavailable or zero.
 */
function getDelta(row: ComparisonMatrixRow, ci: number): string | null {
  if (!row.raw.length || ci === 0) return null;

  const base = row.raw[0];
  const curr = row.raw[ci];
  if (base == null || curr == null) return null;

  const delta = curr - base;
  // Skip trivially-zero deltas
  if (Math.abs(delta) < 0.005) return null;

  // Use first column's display value to infer the format
  const sample = String(row.values[0] ?? "");
  if (sample === "—") return null;

  return formatDelta(delta, sample);
}

export default function ComparisonMatrix({ comparisonId }: Props) {
  const { data: matrix, isLoading } = useComparisonMatrix(comparisonId);
  const remove = useRemoveFromComparison();

  if (isLoading)
    return <p className="text-sm text-gray-500 animate-pulse">Loading comparison…</p>;
  if (!matrix || !matrix.property_ids.length)
    return <p className="text-sm text-gray-500">No properties in this comparison.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-gray-500 font-medium w-36 shrink-0">
              Field
            </th>
            {matrix.addresses.map((addr, i) => (
              <th key={i} className="py-2 px-3 text-left font-medium text-blue-700 min-w-[180px]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="line-clamp-2 text-xs">{addr}</span>
                    {i === 0 && (
                      <span className="text-[10px] font-normal text-gray-400 mt-0.5 block">
                        baseline
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      remove.mutate({ compId: comparisonId, propId: matrix.property_ids[i] })
                    }
                    className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-2 pr-4 text-gray-500 text-xs font-medium">{row.label}</td>
              {row.values.map((val, ci) => {
                const delta = getDelta(row, ci);
                return (
                  <td key={ci} className="py-2 px-3 text-gray-800">
                    <div>{val ?? "—"}</div>
                    {delta && (
                      <div className="text-[11px] text-gray-400 leading-tight mt-0.5">
                        {delta}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
