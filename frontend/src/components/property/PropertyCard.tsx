import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, Trash2 } from "lucide-react";
import { type Property } from "@/types";
import { fmt$, fmtNum } from "@/lib/utils";
import { useDeleteProperty } from "@/hooks/useProperties";

interface Props {
  property: Property;
}

export default function PropertyCard({ property: p }: Props) {
  const del = useDeleteProperty();

  const photos = p.photos_json ? (JSON.parse(p.photos_json) as string[]) : [];
  const thumb = photos[0];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {thumb ? (
        <img src={thumb} alt={p.address} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          No photo
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-blue-700 truncate">
              {fmt$(p.list_price)}
            </p>
            <p className="text-sm text-gray-600 truncate">{p.address}</p>
          </div>
          <button
            onClick={() => del.mutate(p.id)}
            className="text-gray-400 hover:text-red-500 shrink-0 mt-0.5"
            title="Remove property"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
          {p.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed size={13} /> {p.bedrooms}bd
            </span>
          )}
          {p.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath size={13} /> {p.bathrooms}ba
            </span>
          )}
          {p.living_area != null && (
            <span className="flex items-center gap-1">
              <Maximize2 size={13} /> {fmtNum(p.living_area)}sf
            </span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            to={`/property/${p.id}`}
            className="flex-1 text-center py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
