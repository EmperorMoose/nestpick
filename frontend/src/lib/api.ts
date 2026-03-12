import axios from "axios";
import type {
  ComparisonList,
  ComparisonMatrix,
  CrimeData,
  NeighborhoodData,
  Property,
  PropertyRating,
  RatingCategory,
  ScrapeStatus,
} from "@/types";

const api = axios.create({ baseURL: "/api" });

export const propertiesApi = {
  list: () => api.get<Property[]>("/properties").then((r) => r.data),
  get: (id: number) => api.get<Property>(`/properties/${id}`).then((r) => r.data),
  scrape: (url: string) =>
    api.post<ScrapeStatus>("/properties/scrape", { url }).then((r) => r.data),
  delete: (id: number) => api.delete(`/properties/${id}`).then((r) => r.data),
  refresh: (id: number) => api.post<ScrapeStatus>(`/properties/${id}/refresh`).then((r) => r.data),
  setOffer: (id: number, offerPrice: number | null) =>
    api.patch(`/properties/${id}/offer`, { offer_price: offerPrice }).then((r) => r.data),
};

export const neighborhoodApi = {
  get: (censusT: string) =>
    api.get<NeighborhoodData>(`/neighborhood/${censusT}`).then((r) => r.data),
  forProperty: (id: number) =>
    api.get<NeighborhoodData>(`/properties/${id}/neighborhood`).then((r) => r.data),
  crime: (id: number) =>
    api.get<CrimeData>(`/properties/${id}/crime`).then((r) => r.data),
};

export const comparisonApi = {
  list: () => api.get<ComparisonList[]>("/comparisons").then((r) => r.data),
  get: (id: number) => api.get<ComparisonList>(`/comparisons/${id}`).then((r) => r.data),
  create: (name: string) =>
    api.post<ComparisonList>("/comparisons", { name }).then((r) => r.data),
  matrix: (id: number) =>
    api.get<ComparisonMatrix>(`/comparisons/${id}/matrix`).then((r) => r.data),
  addProperty: (compId: number, propId: number) =>
    api.post(`/comparisons/${compId}/properties/${propId}`).then((r) => r.data),
  removeProperty: (compId: number, propId: number) =>
    api.delete(`/comparisons/${compId}/properties/${propId}`).then((r) => r.data),
};

export const ratingsApi = {
  get: (propertyId: number) =>
    api.get<PropertyRating[]>(`/properties/${propertyId}/ratings`).then((r) => r.data),
  upsert: (propertyId: number, user: "pierce" | "rach", ratings: Partial<Record<RatingCategory, number | null>>) =>
    api.put<PropertyRating>(`/properties/${propertyId}/ratings/${user}`, ratings).then((r) => r.data),
};

export const healthApi = {
  check: () => api.get("/health").then((r) => r.data),
};
