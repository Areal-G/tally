"use client";

import { useEffect, useRef } from "react";
import { WEDGE_MAX_KEY_GAP_MS, WEDGE_MIN_LENGTH } from "@/lib/inventory/barcode-decoder";

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Listen for a hardware barcode scanner (USB / Bluetooth keyboard wedge) anywhere on
 * the page. Scanners "type" the code in a burst and finish with Enter (or Tab); a
 * person typing is far slower, so slow keystrokes never trigger a scan.
 *
 * Keys typed into a text field are left alone — that field handles them itself.
 */
export function useKeyboardWedge(onScan: (code: string) => void, enabled = true) {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let last = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isEditable(e.target)) {
        buffer = "";
        return;
      }
      const now = performance.now();
      if (now - last > WEDGE_MAX_KEY_GAP_MS) buffer = "";
      last = now;

      if (e.key === "Enter" || e.key === "Tab") {
        if (buffer.length >= WEDGE_MIN_LENGTH) {
          e.preventDefault();
          const code = buffer;
          buffer = "";
          onScanRef.current(code);
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}
