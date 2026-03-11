import { scoreColor } from "@/lib/utils";

interface Props {
  label: string;
  score: number | null;
  description?: string | null;
}

export default function ScoreBar({ label, score, description }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">{score ?? "—"}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score)}`}
          style={{ width: score != null ? `${score}%` : "0%" }}
        />
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
}
