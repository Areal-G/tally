/**
 * TanStack Query options for SSR-passed initialData.
 * Use on first render so hooks are not isPending when server data exists.
 */
export function withInitialData<T>(initialData?: T) {
  if (initialData === undefined) return {};
  return {
    initialData,
    initialDataUpdatedAt: Date.now(),
    // Skip refetch on first mount; refetch when invalidated (back nav after CRUD).
    refetchOnMount: (query: { isStale: () => boolean }) => query.isStale(),
  } as const;
}
