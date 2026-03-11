import { fmt$ } from "@/lib/utils";

const RATES = [5.5, 5.7, 5.9, 6.1, 6.3, 6.5];
const DOWN = 0.2;
const MONTHS = 360;

function monthlyPayment(price: number, annualRatePct: number): number {
  const loan = price * (1 - DOWN);
  const r = annualRatePct / 100 / 12;
  return (loan * (r * Math.pow(1 + r, MONTHS))) / (Math.pow(1 + r, MONTHS) - 1);
}

interface Props {
  listPrice: number;
}

export default function MortgageTable({ listPrice }: Props) {
  const discounted = Math.round(listPrice * 0.9);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        20% down · 30-year fixed · principal & interest only
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 pr-4 text-xs font-medium text-gray-500">Rate</th>
              <th className="text-right pb-2 px-3 text-xs font-medium text-gray-500">
                List&nbsp;
                <span className="font-normal text-gray-400">({fmt$(listPrice)})</span>
              </th>
              <th className="text-right pb-2 pl-3 text-xs font-medium text-gray-500">
                −10%&nbsp;
                <span className="font-normal text-gray-400">({fmt$(discounted)})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {RATES.map((rate) => {
              const pmtFull = Math.round(monthlyPayment(listPrice, rate));
              const pmtDisc = Math.round(monthlyPayment(discounted, rate));
              return (
                <tr key={rate} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-4 font-medium text-gray-700 tabular-nums">
                    {rate.toFixed(1)}%
                  </td>
                  <td className="py-1.5 px-3 text-right text-gray-800 tabular-nums">
                    {fmt$(pmtFull)}/mo
                  </td>
                  <td className="py-1.5 pl-3 text-right text-gray-500 tabular-nums">
                    {fmt$(pmtDisc)}/mo
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
