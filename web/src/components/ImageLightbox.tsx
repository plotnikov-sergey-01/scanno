"use client";

import { useEffect, useCallback } from "react";
import styles from "./ImageLightbox.module.css";

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
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
      >
        Close
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className={styles.previousButton}
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.nextButton}
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
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <p className={styles.counter}>
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
