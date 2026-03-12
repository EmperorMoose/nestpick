import { useState } from "react";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/property/PropertyCard";
import PropertyImport from "@/components/property/PropertyImport";
import { Home, Bookmark } from "lucide-react";

type Filter = "all" | "top";

export default function DashboardPage() {
  const { data: properties, isLoading } = useProperties();
  const [filter, setFilter] = useState<Filter>("all");

  const topCount = properties?.filter((p) => p.is_top_option).length ?? 0;
  const allCount = properties?.length ?? 0;

  const visible =
    filter === "top"
      ? (properties ?? []).filter((p) => p.is_top_option)
      : (properties ?? []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Saved Properties</h1>
          <p className="text-sm text-gray-500">
            {allCount} house{allCount !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <PropertyImport />
      </div>

      {/* Filter tabs */}
      {!isLoading && allCount > 0 && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setFilter("all")}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            <Home size={13} />
            All
            <span className={[
              "ml-0.5 text-xs rounded-full px-1.5 py-0.5 leading-none",
              filter === "all" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600",
            ].join(" ")}>
              {allCount}
            </span>
          </button>

          <button
            onClick={() => setFilter("top")}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === "top"
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            <Bookmark size={13} fill={filter === "top" ? "currentColor" : "none"} />
            Top Picks
            <span className={[
              "ml-0.5 text-xs rounded-full px-1.5 py-0.5 leading-none",
              filter === "top" ? "bg-amber-400 text-white" : "bg-gray-200 text-gray-600",
            ].join(" ")}>
              {topCount}
            </span>
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && allCount === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Home size={48} strokeWidth={1} />
          <p className="mt-4 text-lg font-medium">No properties yet</p>
          <p className="text-sm mt-1">Paste a Zillow URL to get started</p>
        </div>
      )}

      {!isLoading && allCount > 0 && filter === "top" && topCount === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Bookmark size={48} strokeWidth={1} />
          <p className="mt-4 text-lg font-medium">No top picks yet</p>
          <p className="text-sm mt-1">
            Click the bookmark icon on any property to mark it as a top pick
          </p>
        </div>
      )}

      {/* Property grid */}
      {!isLoading && visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
