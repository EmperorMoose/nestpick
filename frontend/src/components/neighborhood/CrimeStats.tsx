import { useCrime } from "@/hooks/useNeighborhood";
import { type NeighborhoodData } from "@/types";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface Props {
  propertyId: number;
  nd: NeighborhoodData;
}

export default function CrimeStats({ propertyId, nd }: Props) {
  const { data: crime } = useCrime(propertyId);

  const total = crime?.total ?? nd.total_crimes_1yr;
  const violent = crime?.violent ?? nd.violent_crimes_1yr;
  const property = crime?.property ?? nd.property_crimes_1yr;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Crime (1-mile radius, last 12 months)</h3>
      {total == null ? (
        <p className="text-sm text-gray-500">Crime data loading…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{violent ?? "—"}</p>
            <p className="text-xs text-red-500 mt-0.5">Violent</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-700">{property ?? "—"}</p>
            <p className="text-xs text-orange-500 mt-0.5">Property</p>
          </div>
        </div>
      )}
    </div>
  );
}
