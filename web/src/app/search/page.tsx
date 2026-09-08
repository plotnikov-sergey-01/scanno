"use client";

import { FormEvent, useEffect, useRef,  useState  } from "react";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import Link from "@/components/LoadingProvider";
import { api, ApiError } from "@/lib/api";
import { ProductCard, ProductCardGrid } from "@/components/ProductCard";
import { ImageCropModal } from "@/components/ImageCropModal";
import { LoadingLabel, Spinner } from "@/components/Spinner";
import type { Product } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { BrowserMultiFormatReader } from "@zxing/browser";


type Notice = { kind: "info" | "error"; text: string };

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState("Point your camera at a barcode");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlRef = useRef<{stop: () => void} | null>(null);
  const [q, setQ] = useState("");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<"search" | "lookup" | "create" | null>(null);
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    name: "",
    brand: "",
    category: "",
    description: "",
    barcode: "",
  });
  const [manualImage, setManualImage] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function openManual(prefill: Partial<{ name: string; brand: string; barcode: string }> = {}) {
    setManual((m) => ({ ...m, ...prefill }));
    setManualOpen(true);
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    setManualOpen(false);
    setPending("search");
    setSearched(true);
    setResults([]);
    try {
      const data = await api.searchProducts(q.trim());
      setResults(data.results);
      if (data.results.length === 0) {
        setNotice({
          kind: "info",
          text: "Product not found in Scanno (or Open Food Facts for this name).",
        });
        setManual((m) => ({ ...m, name: q.trim() }));
      }
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Search failed",
      });
    } finally {
      setPending(null);
    }
  }

  async function lookupBarcodeValue(value: string) {
    const clean = value.trim();
    if (!clean) return ;

    setNotice(null);
    setManualOpen(false);
    setPending("lookup");
    setSearched(true);
    setResults([]);

    try {
      const product = await api.lookupBarcode(clean);
      router.push(`/products/${product.id}`);
    } catch (err){
      if (err instanceof ApiError && err.status === 404) {
        setNotice({
          kind : "info",
          text: "Product not found by this barcode",
        });
        setManual((m) =>({...m, barcode: clean}));
      } else if (err instanceof ApiError && err.status === 401){
        setNotice({ kind: "error", text : "Please log in to continue."});
        router.push("/login");
      } else {
        setNotice({
          kind : "error",
          text : err instanceof Error ? err.message : "Lookup failed",
        });
      } 
    } finally {
      setPending(null);
    }
  }

  async function onLookup(e: FormEvent) {
   e.preventDefault();
   await lookupBarcodeValue(barcode);
  }

  function closeScanner() {
    scannerControlRef.current?.stop();
    scannerControlRef.current = null;
    setScannerOpen(false);
    setScannerError(null);
    setScannerStatus("Point your camera at a barcode");
  }

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;

    let cancelled = false;
    let controls : { stop: () => void} | null = null;
    const reader = new BrowserMultiFormatReader();

    async function startScanner() {
      try {
        setScannerError(null);
        setScannerStatus("Starting camera...");
         controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          async (result) => {
            if (!result || cancelled) return;

            const scannedBarcode =result.getText();
            cancelled = true;

            setBarcode(scannedBarcode);
            setScannerStatus(`Found ${scannedBarcode}`);
            controls?.stop();
            scannerControlRef.current = null;
            setScannerOpen(false);
            await lookupBarcodeValue(scannedBarcode);
          }
        );

        scannerControlRef.current = controls;
        setScannerStatus("Point your camera at a barcode");
      } catch (err) {
        setScannerError(
          err instanceof Error
          ? err.message
          : "Camera could not be started."
        );
        setScannerStatus("Scanner unavailable");
      }
    }
    startScanner();
    return () => {
      cancelled = true;
      controls?.stop();
      scannerControlRef.current?.stop();
      scannerControlRef.current = null;
    };
  }, [scannerOpen]);

  async function onManual(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    setPending("create");
    setNotice(null);
    try {
      const product = await api.createProduct({
        name: manual.name,
        brand: manual.brand,
        category: manual.category || "",
        description: manual.description || "",
        barcode: manual.barcode || null,
      } as Partial<Product>);
      if (product.already_exists) {
        setNotice({
          kind: "info",
          text: product.detail || "Product already exists — opening that card.",
        });
      }
      if (manualImage && product.can_edit_image && !product.already_exists) {
        try {
          await api.uploadProductImage(product.id, manualImage);
        } catch {
          // optional
        }
      }
      router.push(`/products/${product.id}`);
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Create failed",
      });
    } finally {
      setPending(null);
    }
  }

  const loading = pending !== null;
  const showAddCta =
    searched &&
    !loading &&
    results.length === 0 &&
    notice?.kind === "info" &&
    !manualOpen;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Search &amp; scan</h1>
      <p className="mt-2 text-ink-700/80">
        Search by name in Scanno (and Open Food Facts if empty). Look up a full barcode to open a
        product card.
      </p>

      <form onSubmit={onSearch} className="mt-8 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product name or brand"
          className="flex-1 rounded-lg border border-ink-100 bg-white px-4 py-3 outline-none ring-scan-400 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-scan-500 px-4 py-3 font-semibold text-white hover:bg-scan-600 disabled:opacity-50"
        >
          {pending === "search" && <Spinner size="sm" onDark />}
          Search
        </button>
      </form>

      <form onSubmit={onLookup} className="mt-4 flex gap-2">
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Barcode (EAN / UPC)"
          className="flex-1 rounded-lg border border-ink-100 bg-white px-4 py-3 font-mono outline-none ring-scan-400 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !barcode.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-scan-500 px-4 py-3 font-semibold text-scan-600 hover:bg-scan-500/10 disabled:opacity-50"
        >
          {pending === "lookup" && <Spinner size="sm" />}
          Lookup
        </button>
        <button
        type="button"
        disabled={loading}
        onClick={() => setScannerOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-3 font-semibold text-white hover:bg-ink-700 disabled:opacity-50">
          Scanning
        </button>
      </form>

      {notice && (
        <div
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            notice.kind === "error"
              ? "bg-verdict-never/10 text-verdict-never"
              : "bg-ink-100 text-ink-700"
          }`}
        >
          <p>{notice.text}</p>
          {showAddCta && (
            <button
              type="button"
              className="mt-3 rounded-md bg-ink-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-ink-700"
              onClick={() =>
                openManual({
                  name: q.trim() || manual.name,
                  barcode: barcode.trim() || manual.barcode,
                })
              }
            >
              Add product
            </button>
          )}
          {showAddCta && !user && (
            <p className="mt-2 text-xs">
              You&apos;ll need to{" "}
              <Link href="/login" className="text-scan-600">
                log in
              </Link>{" "}
              to create it.
            </p>
          )}
        </div>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-ink-900/90 p-4">
          <div className="mx-auto flex h-full max-w-md flex-col">
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div>
                <h2 className="font-display text-xl font-bold">Scan barcode</h2>
                <p className="text-sm text-white/70">{scannerStatus}</p>
              </div>
              <button
              type="button"
              onClick={closeScanner}
              className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
                Close
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl bg-black">
              <video 
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline />

              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-lg border-2 border-scan-400" ></div>
            </div>

            {scannerError && (
              <p className="mt-3 rounded-lg bg-verdict-never/20 px-3 py-2 text-sm text-white">
                {scannerError}
              </p>
            )}
          </div>
        </div>
      )}

      {manualOpen && (
        <form onSubmit={onManual} className="mt-6 space-y-3 rounded-xl border border-ink-100 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Add product manually</h2>
            <button
              type="button"
              className="text-sm text-ink-700/70 hover:text-ink-900"
              onClick={() => setManualOpen(false)}
            >
              Close
            </button>
          </div>
          {!user && (
            <p className="text-sm text-ink-700">
              <Link href="/login" className="text-scan-600">
                Log in
              </Link>{" "}
              to create a product.
            </p>
          )}
          <input
            required
            value={manual.name}
            onChange={(e) => setManual({ ...manual, name: e.target.value })}
            placeholder="Name"
            className="w-full rounded-lg border border-ink-100 px-3 py-2"
          />
          <input
            value={manual.brand}
            onChange={(e) => setManual({ ...manual, brand: e.target.value })}
            placeholder="Brand"
            className="w-full rounded-lg border border-ink-100 px-3 py-2"
          />
          <input
            value={manual.category}
            onChange={(e) => setManual({ ...manual, category: e.target.value })}
            placeholder="Category (optional) — e.g. Yogurt, Snacks"
            className="w-full rounded-lg border border-ink-100 px-3 py-2"
          />
          <textarea
            value={manual.description}
            onChange={(e) => setManual({ ...manual, description: e.target.value })}
            placeholder="Short description (optional) — what is this product?"
            rows={2}
            className="w-full rounded-lg border border-ink-100 px-3 py-2"
          />
          <input
            value={manual.barcode}
            onChange={(e) => setManual({ ...manual, barcode: e.target.value })}
            placeholder="Barcode"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 font-mono"
          />
          <label className="block text-sm text-ink-700">
            Product photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCropFile(file);
              }}
            />
          </label>
          {manualImage && <p className="text-xs text-ink-700/70">Photo ready (cropped).</p>}
          <button
            type="submit"
            disabled={!user || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {pending === "create" && <Spinner size="sm" onDark />}
            Create product
          </button>
        </form>
      )}

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(blob) => {
            setManualImage(new File([blob], "product.jpg", { type: blob.type || "image/jpeg" }));
            setCropFile(null);
          }}
        />
      )}

      <div className="mt-8">
        {pending === "search" ? (
          <LoadingLabel />
        ) : (
          <>
            {results.length > 0 && (
              <div className="mb-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLayout("list")}
                  className={`rounded-md px-2 py-1 text-sm ${
                    layout === "list" ? "bg-scan-500 text-white" : "bg-white ring-1 ring-ink-100"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("grid")}
                  className={`rounded-md px-2 py-1 text-sm ${
                    layout === "grid" ? "bg-scan-500 text-white" : "bg-white ring-1 ring-ink-100"
                  }`}
                >
                  Cards
                </button>
              </div>
            )}
            {layout === "grid" ? (
              <ProductCardGrid products={results} />
            ) : (
              results.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
