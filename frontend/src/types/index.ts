export interface PriceHistoryItem {
  event_date: string | null;
  price: number | null;
  event_type: string | null;
  source: string | null;
}

export interface TaxHistoryItem {
  tax_year: number | null;
  tax_amount: number | null;
  assessed_value: number | null;
}

export interface SchoolInfo {
  id: number;
  name: string;
  school_type: string | null;
  greatschools_rating: number | null;
  nc_dpi_grade: string | null;
  proficiency_pct: number | null;
  distance_mi: number | null;
  is_assigned: boolean;
}

export interface Property {
  id: number;
  address: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  census_tract: string | null;
  zillow_url: string | null;
  zillow_id: string | null;
  mls_number: string | null;
  parcel_id: string | null;
  list_price: number | null;
  offer_price: number | null;
  is_top_option: boolean;
  avg_rating: number | null;
  zestimate: number | null;
  rent_zestimate: number | null;
  price_per_sqft: number | null;
  home_status: string | null;
  days_on_market: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_area: number | null;
  lot_size: number | null;
  year_built: number | null;
  property_type: string | null;
  stories: number | null;
  garage_spaces: number | null;
  has_pool: boolean | null;
  hoa_fee: number | null;
  assessed_value: number | null;
  land_value: number | null;
  building_value: number | null;
  annual_tax: number | null;
  description: string | null;
  photos_json: string | null;
  features_json: string | null;
  data_source: string | null;
  created_at: string;
  updated_at: string;
  price_history: PriceHistoryItem[];
  tax_history: TaxHistoryItem[];
  schools: SchoolInfo[];
}

export interface NeighborhoodData {
  census_tract: string;
  median_income: number | null;
  median_home_value: number | null;
  median_rent: number | null;
  total_population: number | null;
  pct_owner_occupied: number | null;
  pct_college_degree: number | null;
  pct_poverty: number | null;
  pct_unemployed: number | null;
  median_year_built: number | null;
  avg_commute_min: number | null;
  pct_white: number | null;
  pct_black: number | null;
  pct_hispanic: number | null;
  pct_asian: number | null;
  total_crimes_1yr: number | null;
  violent_crimes_1yr: number | null;
  property_crimes_1yr: number | null;
  crime_last_fetched: string | null;
  walk_score: number | null;
  transit_score: number | null;
  bike_score: number | null;
  walk_score_desc: string | null;
  flood_zone: string | null;
  is_sfha: boolean | null;
  air_quality_index: number | null;
  data_fetched_at: string;
}

export interface CrimeIncident {
  date: string | null;
  description: string | null;
  category: "violent" | "property";
  lat: number | null;
  lng: number | null;
}

export interface CrimeData {
  total: number | null;
  violent: number | null;
  property: number | null;
  incidents: CrimeIncident[];
}

export interface ComparisonItem {
  property: Property;
  added_at: string;
  notes: string | null;
  user_rating: number | null;
}

export interface ComparisonList {
  id: number;
  name: string;
  created_at: string;
  items: ComparisonItem[];
}

export interface ComparisonMatrixRow {
  label: string;
  values: (string | number | boolean | null)[];
  /** Raw numeric values parallel to `values`. Empty array = no delta for this row. */
  raw: (number | null)[];
}

export interface ComparisonMatrix {
  property_ids: number[];
  addresses: string[];
  rows: ComparisonMatrixRow[];
}

export const RATING_CATEGORIES = ["layout", "aesthetics", "upkeep", "yard", "area", "neighborhood", "overall"] as const;
export type RatingCategory = typeof RATING_CATEGORIES[number];

export interface PropertyRating {
  user_name: "pierce" | "rach";
  layout: number | null;
  aesthetics: number | null;
  upkeep: number | null;
  yard: number | null;
  area: number | null;
  neighborhood: number | null;
  overall: number | null;
  updated_at: string;
}

export interface CommuteData {
  duration_text: string;
  duration_seconds: number;
  distance_text: string;
  distance_meters: number;
  destination: string;
}

export interface ScrapeStatus {
  success: boolean;
  property_id: number | null;
  message: string;
  zillow_ok: boolean;
  polaris_ok: boolean;
}
