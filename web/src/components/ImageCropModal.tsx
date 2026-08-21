"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

/** Simple free-form crop: drag a rectangle, then export. */
export function ImageCropModal({ file, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = Math.min(640, window.innerWidth - 48);
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setRect({ x: 0, y: 0, w: canvas.width, h: canvas.height });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function redraw(activeRect: { x: number; y: number; w: number; h: number } | null) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (activeRect && activeRect.w > 0 && activeRect.h > 0) {
      ctx.fillStyle = "rgba(15,27,45,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(activeRect.x, activeRect.y, activeRect.w, activeRect.h);
      ctx.drawImage(
        img,
        (activeRect.x / canvas.width) * img.width,
        (activeRect.y / canvas.height) * img.height,
        (activeRect.w / canvas.width) * img.width,
        (activeRect.h / canvas.height) * img.height,
        activeRect.x,
        activeRect.y,
        activeRect.w,
        activeRect.h
      );
      ctx.strokeStyle = "#00b4ef";
      ctx.lineWidth = 2;
      ctx.strokeRect(activeRect.x, activeRect.y, activeRect.w, activeRect.h);
    }
  }

  useEffect(() => {
    redraw(rect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect]);

  function pos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(canvas.width, ((clientX - bounds.left) / bounds.width) * canvas.width)),
      y: Math.max(0, Math.min(canvas.height, ((clientY - bounds.top) / bounds.height) * canvas.height)),
    };
  }

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const p = pos(e);
    setDragging(true);
    setStart(p);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragging || !start) return;
    const p = pos(e);
    setRect({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }

  function onUp() {
    setDragging(false);
  }

  async function confirm() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const r = rect && rect.w > 8 && rect.h > 8 ? rect : { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const out = document.createElement("canvas");
    const sx = (r.x / canvas.width) * img.width;
    const sy = (r.y / canvas.height) * img.height;
    const sw = (r.w / canvas.width) * img.width;
    const sh = (r.h / canvas.height) * img.height;
    out.width = Math.max(1, Math.round(sw));
    out.height = Math.max(1, Math.round(sh));
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4">
      <div className="max-w-full rounded-xl bg-white p-4 shadow-xl">
        <h3 className="font-display text-lg font-bold">Crop photo</h3>
        <p className="mt-1 text-sm text-ink-700/80">Drag on the image to select the area to keep.</p>
        <canvas
          ref={canvasRef}
          className="mt-3 max-w-full touch-none rounded-lg border border-ink-100"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-ink-700 hover:bg-ink-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (canvasRef.current && imgRef.current) {
                setRect({ x: 0, y: 0, w: canvasRef.current.width, h: canvasRef.current.height });
              }
            }}
            className="rounded-md px-3 py-2 text-ink-700 hover:bg-ink-100"
          >
            Use full image
          </button>
          <button type="button" onClick={confirm} className="rounded-md bg-scan-500 px-3 py-2 font-semibold text-white">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
