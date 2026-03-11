import { useParams, Link } from "react-router-dom";
import { useProperty } from "@/hooks/useProperties";
import NeighborhoodDashboard from "@/components/neighborhood/NeighborhoodDashboard";
import PriceHistoryChart from "@/components/property/PriceHistoryChart";
import MortgageTable from "@/components/property/MortgageTable";
import { fmt$, fmtNum, fmtDate, fmtStatus, fmtPropertyType } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";

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
              <MortgageTable listPrice={p.list_price} />
            </Section>
          )}

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

        {/* Right: Neighborhood */}
        <div>
          <Section title="Neighborhood">
            <NeighborhoodDashboard propertyId={p.id} schools={p.schools} />
          </Section>
        </div>
      </div>
    </div>
  );
}
