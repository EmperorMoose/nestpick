import { useState } from "react";
import { fmt$ } from "@/lib/utils";

export function monthlyPayment(price: number, rate: number, down: number, years: number) {
  const loan = price * (1 - down / 100);
  const r = rate / 1200;
  return r === 0 ? loan / (years * 12) : loan * r / (1 - Math.pow(1 + r, -years * 12));
}
interface Props { listPrice: number; offerPrice?: number | null; annualTax?: number | null; hoaFee?: number | null }
export default function MortgageTable({ listPrice, offerPrice, annualTax, hoaFee }: Props) {
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(30);
  const [taxInput, setTax] = useState<number | null>(null);
  const [insurance, setInsurance] = useState(0);
  const [hoaInput, setHoa] = useState<number | null>(null);
  const [pmiRate, setPmi] = useState(0.5);
  const tax = taxInput ?? annualTax ?? 0;
  const hoa = hoaInput ?? hoaFee ?? 0;
  const price = offerPrice && offerPrice > 0 ? offerPrice : listPrice;
  const loan = price * (1 - down / 100);
  const pi = monthlyPayment(price, rate, down, years);
  const pmi = down < 20 ? loan * pmiRate / 1200 : 0;
  const total = (p: number, r: number) => monthlyPayment(p, r, down, years) + tax / 12 + insurance / 12 + hoa + (down < 20 ? p * (1 - down / 100) * pmiRate / 1200 : 0);
  const scenarios = [{ label: "List", price: listPrice }, { label: "−10%", price: Math.round(listPrice * 0.9) }, ...(offerPrice && offerPrice > 0 ? [{ label: "Offer", price: offerPrice }] : [])];
  const fields = [
    { label: "Down payment (%)", value: down, set: (n: number) => setDown(n), max: 100, step: 1 },
    { label: "Interest rate (%)", value: rate, set: (n: number) => setRate(n), max: 30, step: 0.125 },
    { label: "Property tax ($/year)", value: tax, set: (n: number) => setTax(n), max: 1000000, step: 100 },
    { label: "Insurance ($/year)", value: insurance, set: (n: number) => setInsurance(n), max: 1000000, step: 100 },
    { label: "HOA ($/month)", value: hoa, set: (n: number) => setHoa(n), max: 100000, step: 10 },
    ...(down < 20 ? [{ label: "PMI (% of loan/year)", value: pmiRate, set: (n: number) => setPmi(n), max: 10, step: 0.05 }] : []),
  ];
  const breakdown: [string, number][] = [["Principal & interest", pi], ["Property tax", tax / 12], ["Insurance", insurance / 12], ["HOA", hoa], ["PMI", pmi]];
  return <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {fields.map(({ label, value, set, max, step }) => <label key={label} className="text-xs text-gray-500">{label}
        <input type="number" min={0} max={max} step={step} value={value} onChange={(e) => set(Number.isFinite(e.target.valueAsNumber) ? Math.max(0, Math.min(max, e.target.valueAsNumber)) : 0)} className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800" />
      </label>)}
      <label className="text-xs text-gray-500">Loan term<select value={years} onChange={(e) => setYears(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800">{[15, 20, 30].map((n) => <option key={n} value={n}>{n} years</option>)}</select></label>
    </div>
    <div className="rounded-lg bg-blue-50 p-4">
      <p className="text-xs text-blue-700">Estimated monthly total · {price === offerPrice ? "saved offer" : "list price"}</p>
      <p className="text-2xl font-bold text-blue-800">{fmt$(total(price, rate))}<span className="text-sm font-normal">/mo</span></p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">{breakdown.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-medium">{fmt$(value)}</dd></div>)}</dl>
      <p className="mt-3 text-xs text-gray-600">Down payment {fmt$(price * down / 100)} · Loan {fmt$(loan)} · Total loan interest {fmt$(pi * years * 12 - loan)}</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <caption className="text-left text-xs text-gray-500 mb-2">Monthly totals at nearby rates</caption>
      <thead><tr className="border-b border-gray-200"><th className="text-left py-2">Rate</th>{scenarios.map((s) => <th key={s.label} className="text-right px-2 text-xs text-gray-500">{s.label}<span className="block font-normal">{fmt$(s.price)}</span></th>)}</tr></thead>
      <tbody>{Array.from(new Set([Math.max(0, rate - 0.5), rate, rate + 0.5])).map((r) => <tr key={r} className={r === rate ? "bg-blue-50 text-blue-800" : "border-b border-gray-50"}><td className="py-2">{Number(r.toFixed(3))}%</td>{scenarios.map((s) => <td key={s.label} className="text-right px-2 tabular-nums">{fmt$(total(s.price, r))}</td>)}</tr>)}</tbody>
    </table></div>
    <p className="text-xs text-gray-500">Planning estimates only. Enter insurance and verify tax/HOA amounts; missing costs start at $0. PMI defaults to an editable 0.5% annually below 20% down. Closing costs and maintenance are excluded. Inputs apply to this page only.</p>
  </div>;
}
