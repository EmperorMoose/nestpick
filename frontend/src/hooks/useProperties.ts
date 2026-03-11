import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { propertiesApi } from "@/lib/api";

export function useProperties() {
  return useQuery({ queryKey: ["properties"], queryFn: propertiesApi.list });
}

export function useProperty(id: number) {
  return useQuery({ queryKey: ["property", id], queryFn: () => propertiesApi.get(id) });
}

export function useScrapeProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => propertiesApi.scrape(url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => propertiesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
