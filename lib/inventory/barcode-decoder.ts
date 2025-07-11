"use client";

/**
 * Camera frame decoding for /scan.
 *
 * Order: jsQR (fast, QR only) → the browser's native BarcodeDetector when it exists
 * (Chrome on Android/macOS) → ZXing in JS for 1D barcodes everywhere else
 * (Firefox, Safari, desktop Chrome on Windows/Linux).
 */
import jsQR from "jsqr";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";

type NativeDetector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

const NATIVE_FORMATS = [
  "qr_code",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "itf",
  "codabar",
  "data_matrix",
];

const ZXING_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
];

export type FrameDecoder = {
  /** Which engine handles 1D barcodes on this browser. */
  engine: "native" | "zxing";
  decode: (canvas: HTMLCanvasElement, image: ImageData) => Promise<string | null>;
};

export async function createFrameDecoder(): Promise<FrameDecoder> {
  let native: NativeDetector | null = null;
  const Ctor = (window as unknown as {
    BarcodeDetector?: (new (o?: { formats: string[] }) => NativeDetector) & {
      getSupportedFormats?: () => Promise<string[]>;
    };
  }).BarcodeDetector;
  if (Ctor) {
    try {
      const supported = (await Ctor.getSupportedFormats?.()) ?? NATIVE_FORMATS;
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      // Only trust the native detector when it actually reads 1D codes.
      if (formats.some((f) => f !== "qr_code")) native = new Ctor({ formats });
    } catch {
      native = null;
    }
  }

  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  reader.setHints(hints);

  const zxing = (image: ImageData): string | null => {
    const { data, width, height } = image;
    const lum = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
      lum[i] = (data[j]! * 299 + data[j + 1]! * 587 + data[j + 2]! * 114) / 1000;
    }
    try {
      const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height)));
      return reader.decodeWithState(bitmap).getText() || null;
    } catch {
      return null; // NotFound / checksum errors are normal for frames without a code
    } finally {
      reader.reset();
    }
  };

  return {
    engine: native ? "native" : "zxing",
    async decode(canvas, image) {
      const qr = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
      if (qr?.data) return qr.data;
      if (native) {
        try {
          const found = await native.detect(canvas);
          return found[0]?.rawValue || null;
        } catch {
          /* fall through to ZXing for this frame */
        }
      }
      return zxing(image);
    },
  };
}

/**
 * Hardware scanners (USB / Bluetooth "keyboard wedge") type the code very fast and
 * end with Enter. Distinguish them from people typing by the speed between keys.
 */
export const WEDGE_MAX_KEY_GAP_MS = 45;
export const WEDGE_MIN_LENGTH = 3;
