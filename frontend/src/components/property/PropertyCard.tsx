import { Link } from "react-router-dom";
import { Bed, Bath, Maximize2, Trash2, Bookmark } from "lucide-react";
import { type Property } from "@/types";
import { fmt$, fmtNum } from "@/lib/utils";
import { useDeleteProperty, useToggleTopOption } from "@/hooks/useProperties";

interface Props {
  property: Property;
}

function StarBadge({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <span className="text-amber-400 text-xs leading-none">★</span>
      <span className="text-xs font-semibold text-amber-700">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function PropertyCard({ property: p }: Props) {
  const del = useDeleteProperty();
  const toggleTop = useToggleTopOption();

  const photos = p.photos_json ? (JSON.parse(p.photos_json) as string[]) : [];
  const thumb = photos[0];

  const displayPrice = p.offer_price ?? p.list_price;
  const hasOffer = p.offer_price != null;

  return (
    <div className={[
      "bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow",
      p.is_top_option ? "border-amber-400 ring-1 ring-amber-300" : "border-gray-200",
    ].join(" ")}>
      {/* Photo */}
      <div className="relative">
        {thumb ? (
          <img src={thumb} alt={p.address} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            No photo
          </div>
        )}
        {p.is_top_option && (
          <div className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase">
            Top Pick
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={`font-semibold ${hasOffer ? "text-blue-600" : "text-blue-700"}`}>
                {fmt$(displayPrice)}
              </p>
              {hasOffer && (
                <span className="text-xs text-gray-400 line-through">{fmt$(p.list_price)}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{p.address}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <button
              onClick={() => toggleTop.mutate(p.id)}
              title={p.is_top_option ? "Remove from top picks" : "Mark as top pick"}
              className={[
                "transition-colors",
                p.is_top_option ? "text-amber-400 hover:text-amber-500" : "text-gray-300 hover:text-amber-400",
              ].join(" ")}
            >
              <Bookmark size={15} fill={p.is_top_option ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => del.mutate(p.id)}
              className="text-gray-300 hover:text-red-500 transition-colors"
              title="Remove property"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          {p.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed size={13} /> {p.bedrooms}bd</span>
          )}
          {p.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath size={13} /> {p.bathrooms}ba</span>
          )}
          {p.living_area != null && (
            <span className="flex items-center gap-1"><Maximize2 size={13} /> {fmtNum(p.living_area)}sf</span>
          )}
          {p.avg_rating != null && (
            <span className="ml-auto"><StarBadge rating={p.avg_rating} /></span>
          )}
        </div>

        <div className="mt-3">
          <Link
            to={`/property/${p.id}`}
            className="block text-center py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
