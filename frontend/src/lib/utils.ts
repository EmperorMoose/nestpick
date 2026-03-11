import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt$( value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function fmtNum(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value) + suffix;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function scoreColor(score: number | null): string {
  if (score == null) return "bg-gray-200";
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-400";
}

const HOME_STATUS_LABELS: Record<string, string> = {
  FOR_SALE: "For Sale",
  FOR_RENT: "For Rent",
  RECENTLY_SOLD: "Recently Sold",
  SOLD: "Sold",
  PENDING: "Pending",
  CONTINGENT: "Contingent",
  OFF_MARKET: "Off Market",
};

export function fmtStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return HOME_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

const PROP_TYPE_LABELS: Record<string, string> = {
  SINGLE_FAMILY: "Single Family",
  MULTI_FAMILY: "Multi-Family",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  MANUFACTURED: "Manufactured",
  LOT: "Land/Lot",
  APARTMENT: "Apartment",
};

export function fmtPropertyType(type: string | null | undefined): string {
  if (!type) return "—";
  return PROP_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function floodZoneLabel(zone: string | null, sfha: boolean | null): { label: string; color: string } {
  if (!zone) return { label: "Unknown", color: "text-gray-500" };
  if (sfha) return { label: `Zone ${zone} (High Risk)`, color: "text-red-600" };
  if (zone.startsWith("X")) return { label: `Zone X (Minimal Risk)`, color: "text-green-600" };
  return { label: `Zone ${zone}`, color: "text-yellow-600" };
}
