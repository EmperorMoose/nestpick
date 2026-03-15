import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useProperty } from "@/hooks/useProperties";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { propertiesApi } from "@/lib/api";
import NeighborhoodDashboard from "@/components/neighborhood/NeighborhoodDashboard";
import PriceHistoryChart from "@/components/property/PriceHistoryChart";
import MortgageTable from "@/components/property/MortgageTable";
import RatingTables from "@/components/property/RatingTables";
import { fmt$, fmtNum, fmtStatus, fmtPropertyType } from "@/lib/utils";
import { ArrowLeft, Car, ExternalLink, MapPin } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading } = useProperty(Number(id));
  const qc = useQueryClient();

  // Offer price input state — initialised from saved value once property loads
  const [offerInput, setOfferInput] = useState<string>("");
  const [offerSaving, setOfferSaving] = useState(false);

  // Sync input when property first loads (or changes)
  const savedOffer = p?.offer_price;

  async function saveOffer() {
    if (!p) return;
    const parsed = offerInput.trim() ? parseInt(offerInput.replace(/,/g, ""), 10) : null;
    if (parsed !== null && (isNaN(parsed) || parsed <= 0)) return;
    setOfferSaving(true);
    try {
      await propertiesApi.setOffer(p.id, parsed);
      // Invalidate so the property (and comparison matrix) reflect new offer_price
      qc.invalidateQueries({ queryKey: ["property", p.id] });
      qc.invalidateQueries({ queryKey: ["comparison-matrix"] });
    } finally {
      setOfferSaving(false);
    }
  }

  function clearOffer() {
    setOfferInput("");
    if (p) {
      propertiesApi.setOffer(p.id, null).then(() => {
        qc.invalidateQueries({ queryKey: ["property", p.id] });
        qc.invalidateQueries({ queryKey: ["comparison-matrix"] });
      });
    }
  }

  const { data: commute, isLoading: commuteLoading, error: commuteError, refetch: fetchCommute, isFetched: commuteFetched } = useQuery({
    queryKey: ["commute", Number(id)],
    queryFn: () => propertiesApi.getCommute(Number(id)),
    enabled: false, // only fetch on demand
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: false,
  });

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (!p) return <p className="text-gray-500">Property not found.</p>;

  const photos = p.photos_json ? (JSON.parse(p.photos_json) as string[]) : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{p.address}</h1>
          <p className="text-sm text-gray-500">{p.city}, {p.state} {p.zip}</p>
        </div>
        {p.zillow_url && (
          <a href={p.zillow_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-600 hover:underline flex items-center gap-1 text-sm">
            Zillow <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          {photos.slice(0, 8).map((url, i) => (
            <img key={i} src={url} alt="" className="h-40 w-60 object-cover rounded-lg shrink-0" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Property Details */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="Listing">
            <Row label="List Price" value={fmt$(p.list_price)} />
            <Row label="Zestimate" value={fmt$(p.zestimate)} />
            <Row label="Price/sqft" value={p.price_per_sqft ? `$${Math.round(p.price_per_sqft).toLocaleString()}/sqft` : null} />
            <Row label="Status" value={fmtStatus(p.home_status)} />
            <Row label="Days on Market" value={p.days_on_market != null ? `${p.days_on_market} days` : null} />
            <Row label="MLS #" value={p.mls_number} />
          </Section>

          <Section title="Property Details">
            <Row label="Beds" value={p.bedrooms} />
            <Row label="Baths" value={p.bathrooms} />
            <Row label="Living Area" value={p.living_area ? fmtNum(p.living_area, " sqft") : null} />
            <Row label="Lot Size" value={p.lot_size ? fmtNum(p.lot_size, " sqft") : null} />
            <Row label="Year Built" value={p.year_built} />
            <Row label="Type" value={fmtPropertyType(p.property_type)} />
            <Row label="Stories" value={p.stories} />
            <Row label="Garage" value={p.garage_spaces != null ? `${p.garage_spaces} car` : null} />
            <Row label="Pool" value={p.has_pool != null ? (p.has_pool ? "Yes" : "No") : null} />
            <Row label="HOA Fee" value={p.hoa_fee != null ? `${fmt$(p.hoa_fee)}/mo` : null} />
          </Section>

          <Section title="Financials">
            <Row label="Annual Tax" value={fmt$(p.annual_tax)} />
            <Row label="Assessed Value" value={fmt$(p.assessed_value)} />
            <Row label="Land Value" value={fmt$(p.land_value)} />
            <Row label="Building Value" value={fmt$(p.building_value)} />
          </Section>

          {p.list_price && (
            <Section title="Monthly Payments">
              {/* Offer price input */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <span className="text-xs text-gray-500 shrink-0">Offer price:</span>
                <div className="relative flex-1 max-w-[180px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={p.list_price.toLocaleString()}
                    value={offerInput || (savedOffer ? savedOffer.toLocaleString() : "")}
                    onChange={(e) => setOfferInput(e.target.value.replace(/[^0-9,]/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && saveOffer()}
                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <button
                  onClick={saveOffer}
                  disabled={offerSaving}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {offerSaving ? "Saving…" : "Save"}
                </button>
                {savedOffer && (
                  <button
                    onClick={clearOffer}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear
                  </button>
                )}
                {savedOffer && (
                  <span className="text-xs text-blue-600 font-medium">
                    ✓ {fmt$(savedOffer)} saved
                  </span>
                )}
              </div>

              <MortgageTable listPrice={p.list_price} offerPrice={savedOffer} />
            </Section>
          )}

          <Section title="Our Ratings">
            <RatingTables propertyId={p.id} />
          </Section>

          {p.price_history.length > 0 && (
            <Section title="Price History">
              <PriceHistoryChart history={p.price_history} />
            </Section>
          )}

          {p.description && (
            <Section title="Description">
              <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>
            </Section>
          )}
        </div>

        {/* Right: Commute + Neighborhood */}
        <div className="space-y-4">
          <Section title="Commute to AssetMark">
            {!commuteFetched && !commuteLoading && (
              <button
                onClick={() => fetchCommute()}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Car size={15} />
                Check Rush Hour Commute
              </button>
            )}

            {commuteLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Car size={15} className="animate-pulse" />
                Calculating…
              </div>
            )}

            {commuteError && (
              <p className="text-sm text-red-500">
                {(commuteError as any)?.response?.data?.detail ?? "Could not load commute. Check that GOOGLE_MAPS_API_KEY is set."}
              </p>
            )}

            {commute && (
              <div>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-3xl font-bold text-gray-800">{commute.duration_text}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">Rush hour · Mon 8:30 AM · {commute.distance_text}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <MapPin size={12} />
                  <span className="truncate">{commute.destination}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${p.lat},${p.lng}&destination=${encodeURIComponent(commute.destination)}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  Open in Google Maps <ExternalLink size={11} />
                </a>
              </div>
            )}
          </Section>

          <Section title="Neighborhood">
            <NeighborhoodDashboard propertyId={p.id} schools={p.schools} />
          </Section>
        </div>
      </div>
    </div>
  );
}
