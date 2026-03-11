import { type SchoolInfo } from "@/types";
import { GraduationCap } from "lucide-react";

function ratingColor(r: number | null) {
  if (r == null) return "bg-gray-200 text-gray-600";
  if (r >= 8) return "bg-green-500 text-white";
  if (r >= 6) return "bg-yellow-400 text-white";
  return "bg-red-400 text-white";
}

function gradeColor(g: string | null) {
  if (!g) return "text-gray-500";
  if (g === "A") return "text-green-600 font-bold";
  if (g === "B") return "text-blue-600 font-bold";
  if (g === "C") return "text-yellow-600 font-bold";
  return "text-red-600 font-bold";
}

export default function SchoolsList({ schools }: { schools: SchoolInfo[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Nearby Schools</h3>
      <div className="space-y-2">
        {schools.map((s) => (
          <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <GraduationCap size={16} className="text-blue-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-gray-500">
                {s.school_type} {s.distance_mi != null ? `· ${s.distance_mi.toFixed(1)} mi` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {s.greatschools_rating != null && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${ratingColor(s.greatschools_rating)}`}>
                  {s.greatschools_rating}/10
                </span>
              )}
              {s.nc_dpi_grade && (
                <span className={`text-sm ${gradeColor(s.nc_dpi_grade)}`}>{s.nc_dpi_grade}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
