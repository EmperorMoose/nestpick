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
    // Poll every 15s until real data arrives
    refetchInterval: (query) => (query.state.data === null ? 15_000 : false),
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
