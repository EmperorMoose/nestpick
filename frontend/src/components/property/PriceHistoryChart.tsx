import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { type PriceHistoryItem } from "@/types";
import { fmt$ } from "@/lib/utils";

interface Props {
  history: PriceHistoryItem[];
}

export default function PriceHistoryChart({ history }: Props) {
  const data = history
    .filter((h) => h.price && h.event_date)
    .map((h) => ({ date: h.event_date?.slice(0, 10), price: h.price, event: h.event_type }))
    .reverse();

  if (!data.length) return <p className="text-sm text-gray-500">No price history available.</p>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={55} />
        <Tooltip formatter={(v: number) => fmt$(v)} labelFormatter={(l) => `Date: ${l}`} />
        <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
