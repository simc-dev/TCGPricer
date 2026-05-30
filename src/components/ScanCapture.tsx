"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/Button";

export function ScanCapture(props: {
  disabled?: boolean;
  previewUrl?: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border">
        <div className="relative aspect-[3/4] w-full bg-surface2">
          {props.previewUrl ? (
            <img
              alt="Captured card"
              src={props.previewUrl}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="grid gap-2">
                <div className="font-display text-[18px] leading-6 tracking-tight text-foreground">Capture a card photo</div>
                <div className="text-xs leading-5 text-muted">Bright lighting, flat card, fill the frame.</div>
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-3 p-4">
          <Button
            type="button"
            variant="primary"
            disabled={props.disabled}
            onClick={() => cameraRef.current?.click()}
          >
            {props.previewUrl ? "Retake photo" : "Open camera"}
          </Button>
          <Button type="button" variant="secondary" disabled={props.disabled} onClick={() => importRef.current?.click()}>
            {props.previewUrl ? "Import different photo" : "Import photo"}
          </Button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={props.disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onFile(f);
            }}
          />
          <input
            ref={importRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={props.disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onFile(f);
            }}
          />

          {props.previewUrl && props.onClear ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                if (cameraRef.current) cameraRef.current.value = "";
                if (importRef.current) importRef.current.value = "";
                props.onClear?.();
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
