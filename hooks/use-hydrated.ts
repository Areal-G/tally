"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during SSR and the hydration pass, true afterwards.
 * Use to gate UI fed only by client-side queries, so a warm TanStack cache
 * can never disagree with the server-rendered loading state.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
