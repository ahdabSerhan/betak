// The longest side of a stored room photo, in pixels; phone photos are far larger than the screen needs.
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

// Reads a photo the visitor picked and returns it as a compact image the page can show as the room.
export async function readRoomPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
