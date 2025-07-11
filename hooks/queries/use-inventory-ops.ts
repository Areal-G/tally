/**
 * TanStack hooks for inventory operations: purchase orders, reorder suggestions,
 * stock movements + adjustments, stock counts, returns and the scanner lookup.
 * Every stock-changing mutation calls invalidateAfterStockChange so catalog,
 * warehouse, dashboard and forecast views refresh.
 */
"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/inventory/client";
import type { MovementType } from "@/lib/inventory/schemas";
import { invalidateAfterStockChange, invalidateAllRelatedQueries } from "@/lib/react-query/invalidate-all";

export const inventoryKeys = {
  all: ["inventory-ops"] as const,
  purchaseOrders: () => [...inventoryKeys.all, "purchase-orders"] as const,
  suggestions: () => [...inventoryKeys.all, "reorder-suggestions"] as const,
  movements: (type?: MovementType, productId?: string) =>
    [...inventoryKeys.all, "movements", type ?? "all", productId ?? "all"] as const,
  counts: () => [...inventoryKeys.all, "stock-counts"] as const,
  returns: () => [...inventoryKeys.all, "returns"] as const,
  returnableOrders: () => [...inventoryKeys.all, "returnable-orders"] as const,
};

function refreshInventory(queryClient: QueryClient, stockChanged: boolean) {
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  if (stockChanged) invalidateAfterStockChange(queryClient);
  else invalidateAllRelatedQueries(queryClient);
}

/* ------------------------------ Purchase orders ----------------------------- */

export function usePurchaseOrders() {
  return useQuery({ queryKey: inventoryKeys.purchaseOrders(), queryFn: inventoryApi.purchaseOrders });
}

export function useReorderSuggestions() {
  return useQuery({ queryKey: inventoryKeys.suggestions(), queryFn: inventoryApi.reorderSuggestions });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createPurchaseOrder,
    onSuccess: () => refreshInventory(queryClient, false),
  });
}

export function usePurchaseOrderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action: string } & Record<string, unknown> }) =>
      inventoryApi.purchaseOrderAction(id, data),
    onSuccess: (_po, vars) => refreshInventory(queryClient, vars.data.action === "receive"),
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deletePurchaseOrder,
    onSuccess: () => refreshInventory(queryClient, false),
  });
}

/* ------------------------------ Stock movements ----------------------------- */

export function useStockMovements(type?: MovementType, productId?: string) {
  return useQuery({
    queryKey: inventoryKeys.movements(type, productId),
    queryFn: () => inventoryApi.movements({ type, productId }),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => refreshInventory(queryClient, true),
  });
}

/* -------------------------------- Stock counts ------------------------------ */

export function useStockCounts() {
  return useQuery({ queryKey: inventoryKeys.counts(), queryFn: inventoryApi.stockCounts });
}

export function useCreateStockCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createStockCount,
    onSuccess: () => refreshInventory(queryClient, false),
  });
}

export function useUpdateStockCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action: "save" | "complete"; lines: unknown[] } }) =>
      inventoryApi.updateStockCount(id, data),
    onSuccess: (_c, vars) => refreshInventory(queryClient, vars.data.action === "complete"),
  });
}

export function useDeleteStockCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteStockCount,
    onSuccess: () => refreshInventory(queryClient, false),
  });
}

/* ---------------------------------- Returns --------------------------------- */

export function useReturns() {
  return useQuery({ queryKey: inventoryKeys.returns(), queryFn: inventoryApi.returns });
}

export function useReturnableOrders(enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.returnableOrders(),
    queryFn: inventoryApi.returnableOrders,
    enabled,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createReturn,
    onSuccess: () => refreshInventory(queryClient, false),
  });
}

export function useReturnAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "restock" | "reject" }) =>
      inventoryApi.returnAction(id, { action }),
    onSuccess: (_r, vars) => refreshInventory(queryClient, vars.action === "restock"),
  });
}

/* --------------------------------- Barcodes --------------------------------- */

/** Link / create / generate / remove a product barcode; refreshes catalog views. */
export function useBarcodeAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.barcode,
    onSuccess: (_res, input) => refreshInventory(queryClient, input.action === "create"),
  });
}
