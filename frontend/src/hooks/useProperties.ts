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

export function useToggleTopOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => propertiesApi.toggleTop(id),
    // Optimistic update so the card flips instantly
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["properties"] });
      const prev = qc.getQueryData<import("@/types").Property[]>(["properties"]);
      qc.setQueryData<import("@/types").Property[]>(["properties"], (old) =>
        old?.map((p) => (p.id === id ? { ...p, is_top_option: !p.is_top_option } : p))
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["properties"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
