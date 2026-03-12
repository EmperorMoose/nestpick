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
  offerPrice?: number | null;
}

export default function MortgageTable({ listPrice, offerPrice }: Props) {
  const hasOffer = offerPrice != null && offerPrice > 0;
  const listMinus10 = Math.round(listPrice * 0.9);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        20% down · 30-year fixed · principal &amp; interest only
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 pr-4 text-xs font-medium text-gray-500">Rate</th>

              {/* List — dimmed + strikethrough header when offer is set */}
              <th className={`text-right pb-2 px-3 text-xs font-medium ${hasOffer ? "text-gray-300" : "text-gray-500"}`}>
                List&nbsp;
                <span className="font-normal">({fmt$(listPrice)})</span>
              </th>

              {/* −10% — dimmed + strikethrough header when offer is set */}
              <th className={`text-right pb-2 px-3 text-xs font-medium ${hasOffer ? "text-gray-300" : "text-gray-500"}`}>
                −10%&nbsp;
                <span className="font-normal">({fmt$(listMinus10)})</span>
              </th>

              {/* Offer column — blue, only visible when offer is set */}
              {hasOffer && (
                <th className="text-right pb-2 pl-4 text-xs font-semibold text-blue-600">
                  Offer&nbsp;
                  <span className="font-normal">({fmt$(offerPrice!)})</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {RATES.map((rate) => {
              const pmtList = Math.round(monthlyPayment(listPrice, rate));
              const pmtDisc = Math.round(monthlyPayment(listMinus10, rate));
              const pmtOffer = hasOffer ? Math.round(monthlyPayment(offerPrice!, rate)) : null;

              return (
                <tr key={rate} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-4 font-medium text-gray-700 tabular-nums">
                    {rate.toFixed(1)}%
                  </td>

                  {/* List price — strike through when offer exists */}
                  <td className={`py-1.5 px-3 text-right tabular-nums ${hasOffer ? "text-gray-300 line-through" : "text-gray-800"}`}>
                    {fmt$(pmtList)}/mo
                  </td>

                  {/* −10% — strike through when offer exists */}
                  <td className={`py-1.5 px-3 text-right tabular-nums ${hasOffer ? "text-gray-300 line-through" : "text-gray-500"}`}>
                    {fmt$(pmtDisc)}/mo
                  </td>

                  {/* Offer payment — blue + bold */}
                  {hasOffer && (
                    <td className="py-1.5 pl-4 text-right text-blue-600 font-semibold tabular-nums">
                      {fmt$(pmtOffer!)}/mo
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
