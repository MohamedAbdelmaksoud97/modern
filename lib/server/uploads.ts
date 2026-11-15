import { AppError } from "./rules";
export function imageMime(bytes: Buffer, name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (
    ext === "png" &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    ["jpg", "jpeg"].includes(ext ?? "") &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    ext === "webp" &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  throw new AppError("الصور المسموحة PNG وJPG وWEBP فقط");
}
