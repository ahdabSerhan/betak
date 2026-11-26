import type { ChangeEvent, ReactNode } from "react";
import { readRoomPhoto } from "../lib/photo";

interface PhotoButtonProps {
  className: string;
  label: string;
  children: ReactNode;
  onPhoto: (photo: string) => void;
}

// A button that lets the visitor pick (or, on a phone, take) a photo of their own room.
export function PhotoButton({ className, label, children, onPhoto }: PhotoButtonProps) {
  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the input lets the same photo be picked again later.
    event.target.value = "";
    if (file) onPhoto(await readRoomPhoto(file));
  };

  return (
    <label className={`${className} photo-button`} aria-label={label} title={label}>
      {children}
      <input className="sr-only" type="file" accept="image/*" onChange={onPick} />
    </label>
  );
}
