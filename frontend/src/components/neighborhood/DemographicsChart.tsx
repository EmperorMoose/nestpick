import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  white: number | null;
  black: number | null;
  hispanic: number | null;
  asian: number | null;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

export default function DemographicsChart({ white, black, hispanic, asian }: Props) {
  const entries = [
    { name: "White", value: white },
    { name: "Black", value: black },
    { name: "Hispanic", value: hispanic },
    { name: "Asian", value: asian },
  ].filter((e) => e.value != null) as { name: string; value: number }[];

  if (!entries.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Racial Composition</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name} ${value?.toFixed(0)}%`} labelLine={false} fontSize={11}>
            {entries.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
