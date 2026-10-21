import { useQuery } from "@tanstack/react-query";
import { neighborhoodApi } from "@/lib/api";
import type { NeighborhoodData } from "@/types";

export function useNeighborhood(propertyId: number) {
  return useQuery<NeighborhoodData | null>({
    queryKey: ["neighborhood", propertyId],
    queryFn: async () => {
      const data = await neighborhoodApi.forProperty(propertyId);
      // API returns {status: "fetching"} while background enrichment runs
      if ((data as any)?.status === "fetching") return null;
      return data as NeighborhoodData;
    },
    // Partial records also need polling while missing ACS economics are refreshed.
    // Bound retries when an upstream provider remains unavailable.
    refetchInterval: (query) => (
      query.state.data !== undefined &&
      (query.state.data === null || query.state.data.median_income == null) &&
      query.state.dataUpdateCount < 5 ? 15_000 : false
    ),
    retry: false,
  });
}

export function useCrime(propertyId: number, enabled = true) {
  return useQuery({
    queryKey: ["crime", propertyId],
    queryFn: () => neighborhoodApi.crime(propertyId),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}
