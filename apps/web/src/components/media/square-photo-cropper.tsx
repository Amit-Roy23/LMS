'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { ZoomIn, X } from 'lucide-react';

const VIEW = 280; // on-screen crop square (px)
const OUTPUT = 512; // saved photo size (px)

interface Props {
  file: File;
  onCancel: () => void;
  /** Receives a 512×512 JPEG of the chosen square. */
  onCropped: (blob: Blob) => Promise<void> | void;
}

/** Lets the user drag and zoom a photo inside a square frame, then exports exactly that square. */
export function SquarePhotoCropper({ file, onCancel, onCropped }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The image always covers the square: base scale fits its shorter side to the frame
  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : VIEW;
  const h = img ? img.naturalHeight * scale : VIEW;
  const clamp = useCallback(
    (o: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(VIEW - w, o.x)),
      y: Math.min(0, Math.max(VIEW - h, o.y)),
    }),
    [w, h]
  );
  // Start centred, and keep the frame covered when zooming
  useEffect(() => {
    if (!img) return;
    setOffset((o) => clamp(o.x === 0 && o.y === 0 && zoom === 1 ? { x: (VIEW - w) / 2, y: (VIEW - h) / 2 } : o));
  }, [img, zoom, w, h, clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
  };
  const onPointerUp = () => (drag.current = null);

  const save = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const size = VIEW / scale;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not crop'))), 'image/jpeg', 0.9));
      await onCropped(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night-950/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-lift p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 id="crop-title" className="font-bold text-ink">Position your photo</h2>
          <button aria-label="Cancel" className="p-1.5 rounded-lg text-slate-500 hover:bg-cream-100" onClick={onCancel}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className="relative mx-auto overflow-hidden rounded-2xl bg-cream-100 touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.src} alt="" draggable={false} style={{ position: 'absolute', left: offset.x, top: offset.y, width: w, height: h, maxWidth: 'none' }} />
          )}
          <div className="absolute inset-0 ring-2 ring-inset ring-white/80 rounded-2xl pointer-events-none" />
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-400">
          <ZoomIn className="w-4 h-4" />
          <span className="sr-only">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-indigo-600" />
        </label>
        <p className="text-xs text-slate-500">Drag to move, use the slider to zoom. The photo is saved as a 512 × 512 square.</p>
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={save} isLoading={saving} disabled={!img}>Save photo</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
