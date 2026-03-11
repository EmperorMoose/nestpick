import { useState } from "react";
import { useComparisons, useCreateComparison, useAddToComparison } from "@/hooks/useComparison";
import { useProperties } from "@/hooks/useProperties";
import ComparisonMatrix from "@/components/comparison/ComparisonMatrix";
import { Plus, GitCompareArrows } from "lucide-react";

export default function ComparisonPage() {
  const { data: comparisons, isLoading } = useComparisons();
  const { data: properties } = useProperties();
  const createList = useCreateComparison();
  const addProp = useAddToComparison();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  const active = comparisons?.find((c) => c.id === activeId) ?? comparisons?.[0];

  async function handleCreate() {
    const name = newName.trim() || "My Comparison";
    const comp = await createList.mutateAsync(name);
    setNewName("");
    setActiveId(comp.id);
  }

  const activePropertyIds = active?.items.map((i) => i.property.id) ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Compare Properties</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        {comparisons?.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              (activeId ?? comparisons?.[0]?.id) === c.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
            }`}
          >
            {c.name} ({c.items.length})
          </button>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New list name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            <Plus size={14} /> Create
          </button>
        </div>
      </div>

      {active && (
        <>
          {/* Add properties to comparison */}
          {properties && properties.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Add properties (max 4):</p>
              <div className="flex flex-wrap gap-2">
                {properties.map((p) => {
                  const inComp = activePropertyIds.includes(p.id);
                  const atMax = activePropertyIds.length >= 4;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !inComp && !atMax && addProp.mutate({ compId: active.id, propId: p.id })}
                      disabled={inComp || (atMax && !inComp)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        inComp
                          ? "bg-blue-50 border-blue-300 text-blue-700 cursor-default"
                          : atMax
                          ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-500"
                          : "bg-white border-gray-200 text-gray-700 hover:border-blue-400 cursor-pointer"
                      }`}
                    >
                      {inComp ? "✓ " : ""}{p.address.split(",")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matrix */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ComparisonMatrix comparisonId={active.id} />
          </div>
        </>
      )}

      {!isLoading && (!comparisons || comparisons.length === 0) && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <GitCompareArrows size={48} strokeWidth={1} />
          <p className="mt-4 text-lg font-medium">No comparison lists yet</p>
          <p className="text-sm mt-1">Create a list and add properties to compare</p>
        </div>
      )}
    </div>
  );
}
