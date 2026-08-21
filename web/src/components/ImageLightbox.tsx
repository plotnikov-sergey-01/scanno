"use client";

import { useEffect, useCallback } from "react";

type Props = {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  const current = images[index];

  const go = useCallback(
    (delta: number) => {
      if (images.length <= 1) return;
      const next = (index + delta + images.length) % images.length;
      onIndexChange(next);
    },
    [images.length, index, onIndexChange]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-md bg-white/10 px-3 py-1 text-white hover:bg-white/20"
        onClick={onClose}
      >
        Close
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-3 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
          >
            ›
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        className="max-h-[90vh] max-w-[95vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <p className="absolute bottom-4 text-sm text-white/80">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
