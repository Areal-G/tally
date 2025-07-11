"use client";

/**
 * Printable product labels: pick products, choose copies and size, print a sheet of
 * QR codes, barcodes, or both. The barcode is the product's own barcode (EAN/UPC kept
 * as-is) or, when it has none, a Code 128 of the SKU. Both are readable by /scan, by the
 * camera and by handheld barcode scanners.
 */
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Barcode, Check, Minus, Plus, Printer, Search, Tag } from "lucide-react";
import { useProducts } from "@/hooks/queries/use-products";
import { useBarcodeAction } from "@/hooks/queries/use-inventory-ops";
import { useToast } from "@/hooks/use-toast";
import { BarcodeImage } from "./BarcodeImage";
import { formatStableCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingRows,
  OpsPage,
  Panel,
  PrimaryButton,
  SmallButton,
  TextInput,
} from "./ops-ui";

type Size = "small" | "large";
type Kind = "qr" | "barcode" | "both";

const KIND_LABEL: Record<Kind, string> = { qr: "QR", barcode: "Barcode", both: "Both" };

export default function LabelsPage() {
  const { data: products = [], isLoading } = useProducts();
  const [query, setQuery] = useState("");
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [size, setSize] = useState<Size>("large");
  const [showPrice, setShowPrice] = useState(true);
  const [kind, setKind] = useState<Kind>("both");
  const barcodeAction = useBarcodeAction();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [qr, setQr] = useState<Record<string, string>>({});

  // Preselect from ?ids=a,b (e.g. the scanner's "Label" button).
  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("ids");
    if (ids) setCopies(Object.fromEntries(ids.split(",").filter(Boolean).map((id) => [id, 1])));
  }, []);

  const selected = useMemo(
    () => products.filter((p) => (copies[p.id] ?? 0) > 0),
    [products, copies],
  );

  useEffect(() => {
    let cancelled = false;
    const missing = selected.filter((p) => !qr[p.id]);
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (p) => [
        p.id,
        await QRCode.toDataURL(JSON.stringify({ productId: p.id, sku: p.sku, name: p.name }), {
          width: 320,
          margin: 1,
          color: { dark: "#141629", light: "#ffffff" },
        }),
      ] as const),
    ).then((pairs) => {
      if (!cancelled) setQr((q) => ({ ...q, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
  }, [selected, qr]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : products;
  }, [products, query]);

  const withoutBarcode = selected.filter((p) => !p.barcode);
  const generateMissing = async () => {
    setGenerating(true);
    let made = 0;
    try {
      for (const p of withoutBarcode) {
        await barcodeAction.mutateAsync({ action: "generate", productId: p.id });
        made++;
      }
      toast({ title: `Generated ${made} barcode${made === 1 ? "" : "s"}` });
    } catch (e) {
      toast({ title: "Could not generate barcodes", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const sheet = selected.flatMap((p) => Array.from({ length: copies[p.id] ?? 0 }, (_, i) => ({ p, key: `${p.id}-${i}` })));
  const setCount = (id: string, n: number) => setCopies((c) => ({ ...c, [id]: Math.max(0, Math.min(99, n)) }));

  return (
    <OpsPage
      title="Labels"
      description="Print QR or barcode labels for shelves and bins. Scan them later from the Scan page."
      actions={
        <PrimaryButton icon={Printer} disabled={sheet.length === 0} onClick={() => window.print()}>
          Print {sheet.length || ""} label{sheet.length === 1 ? "" : "s"}
        </PrimaryButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Panel
          title="Products"
          icon={Tag}
          description={`${selected.length} selected`}
          actions={
            selected.length > 0 ? (
              <SmallButton onClick={() => setCopies({})}>Clear</SmallButton>
            ) : (
              <SmallButton tone="brand" onClick={() => setCopies(Object.fromEntries(filtered.map((p) => [p.id, 1])))}>
                Select all
              </SmallButton>
            )
          }
        >
          <div className="border-b border-[var(--border-subtle)] p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <TextInput aria-label="Search products" placeholder="Search name or SKU" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {isLoading ? (
            <LoadingRows />
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {filtered.map((p) => {
                const n = copies[p.id] ?? 0;
                return (
                  <li key={p.id} className="flex items-center gap-3 border-t border-[var(--border-subtle)] px-4 py-2.5 first:border-t-0">
                    <button
                      type="button"
                      aria-label={n ? `Unselect ${p.name}` : `Select ${p.name}`}
                      onClick={() => setCount(p.id, n ? 0 : 1)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        n ? "border-transparent bg-[image:var(--brand-gradient)] text-white" : "border-[var(--border-subtle)]",
                      )}
                    >
                      {n > 0 && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{p.name}</p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {p.sku}
                        {p.barcode ? <span className="text-[var(--accent-purple)]"> · {p.barcode}</span> : null}
                      </p>
                    </div>
                    {n > 0 && (
                      <div className="flex items-center gap-1">
                        <SmallButton icon={Minus} aria-label="Fewer copies" className="h-7 px-2" onClick={() => setCount(p.id, n - 1)} />
                        <span className="w-5 text-center text-sm font-semibold tabular-nums">{n}</span>
                        <SmallButton icon={Plus} aria-label="More copies" className="h-7 px-2" onClick={() => setCount(p.id, n + 1)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Preview"
          icon={Printer}
          description="This is what prints. Use your browser's print dialog for paper size."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-full border border-[var(--border-subtle)] p-1" role="group" aria-label="Code type">
                {(["qr", "barcode", "both"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      kind === k ? "bg-[image:var(--brand-gradient)] text-white" : "text-[var(--text-secondary)]",
                    )}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-full border border-[var(--border-subtle)] p-1" role="group" aria-label="Label size">
                {(["small", "large"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={size === s}
                    onClick={() => setSize(s)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                      size === s ? "bg-[image:var(--brand-gradient)] text-white" : "text-[var(--text-secondary)]",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <SmallButton tone={showPrice ? "brand" : "neutral"} onClick={() => setShowPrice((v) => !v)}>
                {showPrice ? "Price shown" : "Price hidden"}
              </SmallButton>
            </div>
          }
          bodyClassName="p-5"
        >
          {kind !== "qr" && withoutBarcode.length > 0 && (
            <div className="mb-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center">
              <Barcode className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
              <p className="flex-1 text-sm text-[var(--text-secondary)]">
                {withoutBarcode.length} selected product{withoutBarcode.length === 1 ? " has" : "s have"} no barcode,
                so {withoutBarcode.length === 1 ? "its" : "their"} SKU is printed as Code 128. Generate proper EAN-13 barcodes instead?
              </p>
              <SmallButton tone="brand" icon={Barcode} disabled={generating} onClick={() => void generateMissing()}>
                {generating ? "Generating…" : "Generate barcodes"}
              </SmallButton>
            </div>
          )}
          {sheet.length === 0 ? (
            <EmptyState icon={Tag} title="No labels yet" description="Pick products from the list to build a sheet." />
          ) : (
            <div className="label-print-area rounded-2xl bg-white p-4">
              <div
                className={cn(
                  "grid gap-3",
                  size === "large" ? "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(112px,1fr))]",
                )}
              >
                {sheet.map(({ p, key }) => (
                  <div
                    key={key}
                    className="label-card flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-3 text-center text-slate-900"
                  >
                    {kind !== "barcode" &&
                      (qr[p.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qr[p.id]}
                          alt={`QR code for ${p.sku}`}
                          className={cn("aspect-square max-w-full object-contain", kind === "both" ? (size === "large" ? "w-20" : "w-14") : size === "large" ? "w-28" : "w-20")}
                        />
                      ) : (
                        <span className={cn("animate-pulse rounded bg-slate-100", size === "large" ? "h-20 w-20" : "h-14 w-14")} />
                      ))}
                    <p className={cn("line-clamp-2 font-semibold leading-tight", size === "large" ? "text-sm" : "text-[11px]")}>{p.name}</p>
                    {kind !== "qr" && (
                      <BarcodeImage
                        value={p.barcode || p.sku}
                        height={size === "large" ? 56 : 40}
                        barWidth={size === "large" ? 2 : 1.4}
                        showText={Boolean(p.barcode)}
                        className={size === "large" ? "max-h-[72px]" : "max-h-14"}
                      />
                    )}
                    <p className="font-mono text-[11px] tracking-wide text-slate-600">{p.sku}</p>
                    {showPrice && (
                      <p className={cn("font-semibold", size === "large" ? "text-sm" : "text-xs")}>{formatStableCurrency(p.price)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </OpsPage>
  );
}
