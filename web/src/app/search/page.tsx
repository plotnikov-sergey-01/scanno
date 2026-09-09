"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import Link from "@/components/LoadingProvider";
import { api, ApiError } from "@/lib/api";
import { ProductCard, ProductCardGrid } from "@/components/ProductCard";
import { ImageCropModal } from "@/components/ImageCropModal";
import { LoadingLabel, Spinner } from "@/components/Spinner";
import type { Product } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import styles from "./page.module.css";

type Notice = { kind: "info" | "error"; text: string };

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState(
    "Point your camera at a barcode",
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlRef = useRef<{ stop: () => void } | null>(null);
  const [q, setQ] = useState("");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<"search" | "lookup" | "create" | null>(
    null,
  );
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

  function openManual(
    prefill: Partial<{ name: string; brand: string; barcode: string }> = {},
  ) {
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
    if (!clean) return;

    setNotice(null);
    setManualOpen(false);
    setPending("lookup");
    setSearched(true);
    setResults([]);

    try {
      const product = await api.lookupBarcode(clean);
      router.push(`/products/${product.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotice({
          kind: "info",
          text: "Product not found by this barcode",
        });
        setManual((m) => ({ ...m, barcode: clean }));
      } else if (err instanceof ApiError && err.status === 401) {
        setNotice({ kind: "error", text: "Please log in to continue." });
        router.push("/login");
      } else {
        setNotice({
          kind: "error",
          text: err instanceof Error ? err.message : "Lookup failed",
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

  function stopScanner() {
    scannerControlRef.current?.stop();
    scannerControlRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function closeScanner() {
    stopScanner();
    setScannerOpen(false);
    setScannerError(null);
    setScannerStatus("Point your camera at a barcode");
  }

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;

    let cancelled = false;
    let controls: { stop: () => void } | null = null;
    const hints = new Map();

    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);

    const reader = new BrowserMultiFormatOneDReader(hints);
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    async function startScanner() {
      try {
        setScannerError(null);
        setScannerStatus("Starting camera...");
        controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current!,
          async (result) => {
            if (!result || cancelled) return;

            const scannedBarcode = result.getText();
            cancelled = true;

            setBarcode(scannedBarcode);
            setScannerStatus(`Found ${scannedBarcode}`);
            stopScanner();
            setScannerOpen(false);
            await lookupBarcodeValue(scannedBarcode);
          },
        );

        scannerControlRef.current = controls;
        setScannerStatus("Point your camera at a barcode");
      } catch (err) {
        setScannerError(
          err instanceof Error ? err.message : "Camera could not be started.",
        );
        setScannerStatus("Scanner unavailable");
      }
    }
    startScanner();
    return () => {
      cancelled = true;
      if (scannerControlRef.current === controls) {
        stopScanner();
      } else {
        controls?.stop();
      }
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
      let createdOrUpdatedProduct = await api.createProduct({
        name: manual.name,
        brand: manual.brand,
        category: manual.category || "",
        description: manual.description || "",
        barcode: manual.barcode || null,
      } as Partial<Product>);
      if (createdOrUpdatedProduct.already_exists) {
        setNotice({
          kind: "info",
          text: createdOrUpdatedProduct.detail || "Product already exists — opening that card.",
        });
      }
      if (manualImage && createdOrUpdatedProduct.can_edit_image && 
        !createdOrUpdatedProduct.already_exists) {
        createdOrUpdatedProduct = await api.uploadProductImage(
          createdOrUpdatedProduct.id,
          manualImage,
        )
      }
      router.push(`/products/${createdOrUpdatedProduct.id}`);
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Create or photo upload failed",
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
      <h1 className={styles.title}>Search &amp; scan</h1>
      <p className={styles.subtitle}>
        Search by name in Scanno (and Open Food Facts if empty). Look up a full
        barcode to open a product card.
      </p>

      <form onSubmit={onSearch} className={styles.searchForm}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product name or brand"
          className={styles.searchInput}
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className={styles.primaryButton}
        >
          {pending === "search" && <Spinner size="sm" onDark />}
          Search
        </button>
      </form>

      <form onSubmit={onLookup} className={styles.lookupForm}>
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Barcode (EAN / UPC)"
          className={styles.barcodeInput}
        />
        <button
          type="submit"
          disabled={loading || !barcode.trim()}
          className={styles.outlineButton}
        >
          {pending === "lookup" && <Spinner size="sm" />}
          Lookup
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setScannerError(null);
            setScannerStatus("Starting camera...");
            setScannerOpen(true);
          }}
          className={styles.darkButton}
        >
          Scanning
        </button>
      </form>

      {notice && (
        <div
          className={
            notice.kind === "error" ? styles.errorNotice : styles.infoNotice
          }
        >
          <p>{notice.text}</p>
          {showAddCta && (
            <button
              type="button"
              className={styles.addProductButton}
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
            <p className={styles.loginHint}>
              You&apos;ll need to{" "}
              <Link href="/login" className={styles.link}>
                log in
              </Link>{" "}
              to create it.
            </p>
          )}
        </div>
      )}

      {scannerOpen && (
        <div className={styles.scannerOverlay}>
          <div className={styles.scannerDialog}>
            <div className={styles.scannerHeader}>
              <div>
                <h2 className={styles.scannerTitle}>Scan barcode</h2>
                <p className={styles.scannerStatus}>{scannerStatus}</p>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                className={styles.scannerCloseButton}
              >
                Close
              </button>
            </div>
            <div className={styles.videoFrame}>
              <video
                ref={videoRef}
                className={styles.video}
                muted
                playsInline
              />

              <div className={styles.scanTarget}></div>
            </div>

            {scannerError && (
              <p className={styles.scannerError}>{scannerError}</p>
            )}
          </div>
        </div>
      )}

      {manualOpen && (
        <form onSubmit={onManual} className={styles.manualForm}>
          <div className={styles.manualHeader}>
            <h2 className={styles.manualTitle}>Add product manually</h2>
            <button
              type="button"
              className={styles.closeManualButton}
              onClick={() => setManualOpen(false)}
            >
              Close
            </button>
          </div>
          {!user && (
            <p className={styles.manualLoginText}>
              <Link href="/login" className={styles.link}>
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
            className={styles.manualInput}
          />
          <input
            value={manual.brand}
            onChange={(e) => setManual({ ...manual, brand: e.target.value })}
            placeholder="Brand"
            className={styles.manualInput}
          />
          <input
            value={manual.category}
            onChange={(e) => setManual({ ...manual, category: e.target.value })}
            placeholder="Category (optional) — e.g. Yogurt, Snacks"
            className={styles.manualInput}
          />
          <textarea
            value={manual.description}
            onChange={(e) =>
              setManual({ ...manual, description: e.target.value })
            }
            placeholder="Short description (optional) — what is this product?"
            rows={2}
            className={styles.manualInput}
          />
          <input
            value={manual.barcode}
            onChange={(e) => setManual({ ...manual, barcode: e.target.value })}
            placeholder="Barcode"
            className={styles.manualBarcodeInput}
          />
          <label className={styles.fileLabel}>
            Product photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className={styles.fileInput}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCropFile(file);
              }}
            />
          </label>
          {manualImage && (
            <p className={styles.photoReady}>Photo ready (cropped).</p>
          )}
          <button
            type="submit"
            disabled={!user || loading}
            className={styles.createButton}
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
            setManualImage(
              new File([blob], "product.jpg", {
                type: blob.type || "image/jpeg",
              }),
            );
            setCropFile(null);
          }}
        />
      )}

      <div className={styles.results}>
        {pending === "search" ? (
          <LoadingLabel />
        ) : (
          <>
            {results.length > 0 && (
              <div className={styles.resultControls}>
                <button
                  type="button"
                  onClick={() => setLayout("list")}
                  className={
                    layout === "list"
                      ? styles.activeResultLayoutButton
                      : styles.resultLayoutButton
                  }
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("grid")}
                  className={
                    layout === "grid"
                      ? styles.activeResultLayoutButton
                      : styles.resultLayoutButton
                  }
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
