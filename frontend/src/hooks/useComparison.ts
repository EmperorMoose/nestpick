import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comparisonApi } from "@/lib/api";
import type { ComparisonList } from "@/types";

export function useComparisons() {
  return useQuery({ queryKey: ["comparisons"], queryFn: comparisonApi.list });
}

export function useComparison(id: number) {
  return useQuery({ queryKey: ["comparison", id], queryFn: () => comparisonApi.get(id) });
}

export function useComparisonMatrix(id: number) {
  return useQuery({ queryKey: ["comparison-matrix", id], queryFn: () => comparisonApi.matrix(id) });
}

export function useCreateComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => comparisonApi.create(name),
    onSuccess: (newComp: ComparisonList) => {
      // Immediately inject into cache so setActiveId(comp.id) finds it without waiting for refetch
      qc.setQueryData<ComparisonList[]>(["comparisons"], (old) =>
        old ? [newComp, ...old] : [newComp]
      );
    },
  });
}

export function useAddToComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ compId, propId }: { compId: number; propId: number }) =>
      comparisonApi.addProperty(compId, propId),
    onSuccess: (_d, { compId }) => {
      qc.invalidateQueries({ queryKey: ["comparisons"] });
      qc.invalidateQueries({ queryKey: ["comparison", compId] });
      qc.invalidateQueries({ queryKey: ["comparison-matrix", compId] });
    },
  });
}

export function useRemoveFromComparison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ compId, propId }: { compId: number; propId: number }) =>
      comparisonApi.removeProperty(compId, propId),
    onSuccess: (_d, { compId }) => {
      qc.invalidateQueries({ queryKey: ["comparisons"] });
      qc.invalidateQueries({ queryKey: ["comparison", compId] });
      qc.invalidateQueries({ queryKey: ["comparison-matrix", compId] });
    },
  });
}
