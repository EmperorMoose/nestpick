import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/property/PropertyCard";
import PropertyImport from "@/components/property/PropertyImport";
import { Home } from "lucide-react";

export default function DashboardPage() {
  const { data: properties, isLoading } = useProperties();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Saved Properties</h1>
          <p className="text-sm text-gray-500">
            {properties?.length ?? 0} house{properties?.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <PropertyImport />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!properties || properties.length === 0) && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Home size={48} strokeWidth={1} />
          <p className="mt-4 text-lg font-medium">No properties yet</p>
          <p className="text-sm mt-1">Paste a Zillow URL to get started</p>
        </div>
      )}

      {properties && properties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
