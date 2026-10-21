import { useNeighborhood } from "@/hooks/useNeighborhood";
import { fmt$, fmtNum, fmtPct, floodZoneLabel } from "@/lib/utils";
import ScoreBar from "@/components/property/ScoreBar";
import CrimeStats from "./CrimeStats";
import DemographicsChart from "./DemographicsChart";
import SchoolsList from "./SchoolsList";
import { type SchoolInfo } from "@/types";
import { AlertTriangle, Droplets } from "lucide-react";

interface Props {
  propertyId: number;
  schools?: SchoolInfo[];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

export default function NeighborhoodDashboard({ propertyId, schools }: Props) {
  const { data: nd, isLoading, isError, refetch, isFetching } = useNeighborhood(propertyId);

  if (isLoading) return <p className="text-sm text-gray-500 animate-pulse">Loading neighborhood data…</p>;
  if (isError) return (
    <p className="text-sm text-gray-500">Neighborhood data unavailable. Try refreshing.</p>
  );
  if (!nd) return (
    <p className="text-sm text-gray-500 animate-pulse">
      Fetching neighborhood data… checking again in 15 seconds.
    </p>
  );

  const { label: floodLabel, color: floodColor } = floodZoneLabel(nd.flood_zone, nd.is_sfha);

  return (
    <div className="space-y-6">
      {/* Walk Scores */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Walkability</h3>
        <div className="space-y-3">
          <ScoreBar label="Walk Score" score={nd.walk_score} description={nd.walk_score_desc} />
          <ScoreBar label="Transit Score" score={nd.transit_score} />
          <ScoreBar label="Bike Score" score={nd.bike_score} />
        </div>
      </div>

      {/* Flood Zone */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Flood Zone</h3>
        <div className="flex items-center gap-2">
          {nd.is_sfha ? <AlertTriangle size={16} className="text-red-500" /> : <Droplets size={16} className="text-blue-400" />}
          <span className={`text-sm font-medium ${floodColor}`}>{floodLabel}</span>
        </div>
      </div>

      {/* Economic Stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Neighborhood Economics</h3>
        <p className="text-xs text-gray-400 mb-2">{nd.acs_vintage ? `${nd.acs_vintage} ACS 5-year estimates · Census tract` : "Census tract estimates"}</p>
        {nd.median_income == null && <p className="text-xs text-gray-500 mb-2">Economics are still unavailable. <button onClick={() => refetch()} disabled={isFetching} className="text-blue-600 underline disabled:opacity-50">{isFetching ? "Checking…" : "Retry"}</button></p>}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Median Income" value={fmt$(nd.median_income)} />
          <Stat label="Median Home Value" value={fmt$(nd.median_home_value)} />
          <Stat label="Median Rent" value={fmt$(nd.median_rent)} />
          <Stat label="Population" value={fmtNum(nd.total_population)} />
          <Stat label="Owner-Occupied" value={fmtPct(nd.pct_owner_occupied)} />
          <Stat label="College Degree" value={fmtPct(nd.pct_college_degree)} />
          <Stat label="Poverty Rate" value={fmtPct(nd.pct_poverty)} />
        </div>
      </div>

      {/* Demographics */}
      <DemographicsChart
        white={nd.pct_white}
        black={nd.pct_black}
        hispanic={nd.pct_hispanic}
        asian={nd.pct_asian}
      />

      {/* Crime */}
      <CrimeStats propertyId={propertyId} nd={nd} />

      {/* Schools */}
      {schools && schools.length > 0 && <SchoolsList schools={schools} />}
    </div>
  );
}
