import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ratingsApi } from "@/lib/api";
import type { PropertyRating, RatingCategory } from "@/types";

export function useRatings(propertyId: number) {
  return useQuery<PropertyRating[]>({
    queryKey: ["ratings", propertyId],
    queryFn: () => ratingsApi.get(propertyId),
  });
}

export function useUpsertRating(propertyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      user,
      ratings,
    }: {
      user: "pierce" | "rach";
      ratings: Partial<Record<RatingCategory, number | null>>;
    }) => ratingsApi.upsert(propertyId, user, ratings),
    onSuccess: (updated) => {
      // Immediately splice the updated rating into the cache
      qc.setQueryData<PropertyRating[]>(["ratings", propertyId], (old) => {
        if (!old) return [updated];
        const exists = old.some((r) => r.user_name === updated.user_name);
        return exists
          ? old.map((r) => (r.user_name === updated.user_name ? updated : r))
          : [...old, updated];
      });
    },
  });
}
