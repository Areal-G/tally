"use client";

/**
 * Scanner: read a product QR code or barcode with the camera, take codes from a
 * handheld USB/Bluetooth scanner, or type a SKU. Shows the product with stock per
 * warehouse and quick actions.
 */
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  ExternalLink,
  Keyboard,
  Loader2,
  History,
  Barcode,
  Usb,
  Package,
  Printer,
  ScanLine,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";
import { InventoryApiError, inventoryApi, type LookupProductDTO } from "@/lib/inventory/client";
import { barcodeKindLabel } from "@/lib/inventory/barcode";
import { useBarcodeAction } from "@/hooks/queries/use-inventory-ops";
import { useToast } from "@/hooks/use-toast";
import { BarcodeImage } from "./BarcodeImage";
import { NameBarcodePanel } from "./NameBarcodePanel";
import { createFrameDecoder, type FrameDecoder } from "@/lib/inventory/barcode-decoder";
import { useKeyboardWedge } from "@/hooks/use-keyboard-wedge";
import { effectiveReorderPoint } from "@/lib/inventory/schemas";
import { formatStableCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdjustStockDialog } from "./AdjustStockDialog";
import {
  EmptyState,
  OpsPage,
  Panel,
  Pill,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  errorMessage,
} from "./ops-ui";

type Source = "camera" | "scanner" | "typed";

const SOURCE_LABEL: Record<Source, string> = {
  camera: "Camera",
  scanner: "Handheld scanner",
  typed: "Typed",
};

/** Decode at most this often; ZXing is too heavy for every animation frame. */
const DECODE_INTERVAL_MS = 120;

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const decoderRef = useRef<FrameDecoder | null>(null);
  const lastDecodeRef = useRef(0);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<LookupProductDTO | null>(null);
  const [history, setHistory] = useState<LookupProductDTO[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [lastSource, setLastSource] = useState<Source | null>(null);
  const [scannerFlash, setScannerFlash] = useState(false);
  /** A scanned code no product has yet — offer to name it. */
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const barcodeAction = useBarcodeAction();
  const { toast } = useToast();

  /** record=false refreshes the shown product without counting it as a new scan. */
  const lookup = useCallback(async (code: string, source: Source, record = true) => {
    setLoading(true);
    setError(null);
    if (record) setLastSource(source);
    try {
      const p = await inventoryApi.lookup(code, record);
      setProduct(p);
      setUnknownCode(null);
      if (source !== "camera") setManual("");
      setHistory((h) =>
        record
          ? [p, ...h.filter((x) => x.id !== p.id)].slice(0, 8)
          : h.map((x) => (x.id === p.id ? { ...p, lastScannedAt: x.lastScannedAt } : x)),
      );
      const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
      if ("vibrate" in nav && nav.userActivation?.hasBeenActive !== false) nav.vibrate?.(60);
    } catch (e) {
      const unknown = e instanceof InventoryApiError && e.status === 404 ? e.body.unknownCode : null;
      if (typeof unknown === "string" && unknown) {
        setUnknownCode(unknown);
        setProduct(null);
        if (source !== "camera") setManual("");
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const runBarcodeAction = async (input: { action: "generate" | "remove"; productId: string }) => {
    try {
      const res = await barcodeAction.mutateAsync(input);
      setProduct((p) => (p && p.id === res.productId ? { ...p, barcode: res.barcode } : p));
      toast({ title: input.action === "generate" ? `Barcode ${res.barcode} created` : "Barcode removed" });
    } catch (e) {
      toast({ title: "Could not update barcode", description: errorMessage(e), variant: "destructive" });
    }
  };

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const now = performance.now();
    const decoder = decoderRef.current;
    if (decoder && video.readyState >= 2 && video.videoWidth > 0 && now - lastDecodeRef.current >= DECODE_INTERVAL_MS) {
      lastDecodeRef.current = now;
      const w = Math.min(video.videoWidth, 720);
      const h = Math.round((video.videoHeight / video.videoWidth) * w);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const code = (await decoder.decode(canvas, ctx.getImageData(0, 0, w, h)))?.trim() || null;
        // Holding a label in view should look it up once, not every few seconds:
        // the same code only counts again after it has been out of view for a moment.
        if (code) {
          const last = lastCodeRef.current;
          const seenRecently = last && last.code === code && Date.now() - last.at < 2500;
          lastCodeRef.current = { code, at: Date.now() };
          if (!seenRecently) void lookup(code, "camera");
        }
      }
    }
    rafRef.current = requestAnimationFrame(() => void tick());
  }, [lookup]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      decoderRef.current ??= await createFrameDecoder();
      setCameraOn(true);
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch (e) {
      setCameraError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in the browser, or type the SKU instead."
          : "No camera found on this device. Type the SKU instead.",
      );
    }
  };

  useEffect(() => stopCamera, [stopCamera]);

  // Open with the store's recent scans (and the latest one shown) instead of an empty page.
  useEffect(() => {
    let cancelled = false;
    inventoryApi
      .recentScans()
      .then((recent) => {
        if (cancelled || recent.length === 0) return;
        setHistory((h) => (h.length ? h : recent));
        setProduct((p) => p ?? recent[0]!);
      })
      .catch(() => {
        /* recent scans are a convenience; the scanner still works */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Handheld scanners work anywhere on the page, no click needed.
  const onHardwareScan = useCallback(
    (code: string) => {
      setScannerFlash(true);
      window.setTimeout(() => setScannerFlash(false), 900);
      void lookup(code.trim(), "scanner");
    },
    [lookup],
  );
  useKeyboardWedge(onHardwareScan, !adjustOpen);

  const available = product ? Math.max(0, product.quantity - product.reservedQuantity) : 0;
  const point = product ? effectiveReorderPoint(product.reorderPoint) : 0;

  return (
    <OpsPage
      title="Scan"
      description="Scan a QR code or barcode with the camera or a handheld scanner, or type a SKU."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Scanner" icon={ScanLine} bodyClassName="flex flex-col gap-4 p-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#0f1020]">
            <video ref={videoRef} playsInline muted className={cameraOn ? "h-full w-full object-cover" : "hidden"} />
            <canvas ref={canvasRef} className="hidden" />
            {cameraOn ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[58%] w-[58%] rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,16,32,0.45)]">
                  <span className="absolute inset-x-4 top-1/2 h-0.5 animate-pulse bg-[var(--accent-purple)]" />
                </div>
                {loading && (
                  <span className="absolute bottom-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up…
                  </span>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="money-brand-fill flex h-14 w-14 items-center justify-center rounded-full">
                  <Camera className="h-6 w-6" />
                </span>
                <p className="text-sm text-white/80">
                  {cameraError ?? "Camera is off. Start it to scan product labels."}
                </p>
              </div>
            )}
          </div>
          {cameraOn ? (
            <SecondaryButton icon={CameraOff} onClick={stopCamera}>
              Stop camera
            </SecondaryButton>
          ) : (
            <PrimaryButton icon={Camera} onClick={startCamera}>
              Start camera
            </PrimaryButton>
          )}
          <div
            className={
              scannerFlash
                ? "flex items-center gap-3 rounded-2xl border border-[var(--status-positive)] bg-[var(--tint-emerald)] px-4 py-3 transition-colors"
                : "flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 transition-colors"
            }
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tint-emerald)] text-[var(--status-positive)]">
              <Usb className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                Handheld scanner ready
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-positive)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-positive)]" />
                </span>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Plug in a USB or Bluetooth scanner and scan. No need to click anything first.
              </p>
            </div>
          </div>
          <p className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <Barcode className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Reads QR codes and barcodes: Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF and Data Matrix.
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) void lookup(manual.trim(), "typed");
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <TextInput
                aria-label="SKU or code"
                placeholder="Type a SKU, e.g. EL-SCN-100"
                className="pl-9"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            </div>
            <PrimaryButton type="submit" loading={loading} disabled={!manual.trim()}>
              Look up
            </PrimaryButton>
          </form>
          {error && (
            <p className="rounded-2xl bg-[var(--tint-rose)] px-4 py-3 text-sm font-medium text-[var(--status-negative)]">{error}</p>
          )}
        </Panel>

        <Panel title={unknownCode ? "Name this barcode" : "Product"} icon={Package} bodyClassName="p-5">
          {unknownCode ? (
            <NameBarcodePanel
              key={unknownCode}
              code={unknownCode}
              onDone={(id) => {
                toast({ title: "Saved. Scan it any time to see this product." });
                void lookup(id, lastSource ?? "typed");
              }}
              onCancel={() => setUnknownCode(null)}
            />
          ) : !product ? (
            <EmptyState icon={ScanLine} title="Nothing scanned yet" description="Scan a label or type a SKU to see stock and actions." />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {lastSource && (
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-purple)]">
                      Found via {SOURCE_LABEL[lastSource].toLowerCase()}
                    </p>
                  )}
                  <p className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{product.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {product.sku}
                    {product.categoryName ? ` · ${product.categoryName}` : ""}
                    {product.supplierName ? ` · ${product.supplierName}` : ""}
                  </p>
                </div>
                <Pill tone={available === 0 ? "rose" : available <= point ? "amber" : "emerald"}>
                  {available === 0 ? "Out of stock" : available <= point ? "Reorder" : "In stock"}
                </Pill>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Tile label="On hand" value={product.quantity} />
                <Tile label="Available" value={available} />
                <Tile label="Price" value={formatStableCurrency(product.price)} />
              </div>
              <BarcodeSection
                barcode={product.barcode}
                pending={barcodeAction.isPending}
                onGenerate={() => void runBarcodeAction({ action: "generate", productId: product.id })}
                onRemove={() => void runBarcodeAction({ action: "remove", productId: product.id })}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Reorder point {point}
                {product.lotNumber ? ` · Lot ${product.lotNumber}` : ""}
              </p>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">By warehouse</p>
                {product.warehouses.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">Not allocated to a warehouse yet.</p>
                ) : (
                  product.warehouses.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 rounded-2xl bg-[var(--bg-elevated)] px-4 py-2.5">
                      <Warehouse className="h-4 w-4 text-[var(--accent-blue)]" />
                      <span className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">{w.name}</span>
                      <span className="text-sm tabular-nums text-[var(--text-primary)]">{w.quantity - w.reserved}</span>
                      <span className="text-xs text-[var(--text-secondary)]">free of {w.quantity}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <PrimaryButton icon={SlidersHorizontal} onClick={() => setAdjustOpen(true)}>
                  Adjust
                </PrimaryButton>
                <Link
                  href={`/products/${product.id}`}
                  className="money-secondary-action inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
                >
                  <ExternalLink className="h-4 w-4" /> Open
                </Link>
                <Link
                  href={`/labels?ids=${product.id}`}
                  className="money-secondary-action inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
                >
                  <Printer className="h-4 w-4" /> Label
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {history.length > 0 && (
        <Panel
          title="Recent scans"
          description="Tap one to see it again"
          icon={History}
          bodyClassName="p-2 sm:p-3"
        >
          <ul className="grid gap-1 sm:grid-cols-2">
            {history.map((h) => {
              const free = Math.max(0, h.quantity - h.reservedQuantity);
              const active = product?.id === h.id && !unknownCode;
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setUnknownCode(null);
                      setProduct(h);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-elevated)]",
                      active && "bg-[var(--tint-violet)] hover:bg-[var(--tint-violet)]",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--accent-purple)]">
                      <Barcode className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{h.name}</span>
                      <span className="block truncate font-mono text-xs text-[var(--text-secondary)]">{h.barcode ?? h.sku}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatStableCurrency(h.price)}
                      </span>
                      <span className="block text-xs text-[var(--text-secondary)]">
                        {free} free{h.lastScannedAt ? ` · ${timeAgo(h.lastScannedAt)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {adjustOpen && product && (
        <AdjustStockDialog
          open={adjustOpen}
          onOpenChange={(o) => {
            setAdjustOpen(o);
            if (!o) void lookup(product.id, "typed", false);
          }}
          productId={product.id}
          productLabel={`${product.name} · ${product.sku}`}
        />
      )}
    </OpsPage>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BarcodeSection({
  barcode,
  pending,
  onGenerate,
  onRemove,
}: {
  barcode: string | null;
  pending: boolean;
  onGenerate: () => void;
  onRemove: () => void;
}) {
  if (!barcode) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center">
        <Barcode className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
        <p className="flex-1 text-sm text-[var(--text-secondary)]">
          No barcode yet. Scan the one on the item to attach it, or make one to print.
        </p>
        <PrimaryButton icon={Barcode} loading={pending} onClick={onGenerate} className="h-9 w-full sm:w-auto">
          Generate barcode
        </PrimaryButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          Barcode · {barcodeKindLabel(barcode)}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onRemove}
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--status-negative)] disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      <div className="flex justify-center rounded-xl bg-white px-4 py-3">
        <BarcodeImage value={barcode} height={52} barWidth={1.8} showText />
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] px-4 py-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
