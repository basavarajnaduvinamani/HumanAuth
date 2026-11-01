import { decode as decodePNG, convertIndexedToRgb } from "fast-png";
import { decode as decodeJPEG } from "jpeg-js";
import { RGB } from "./types";
function dimensions(width: number, height: number) {
  if (Math.max(width, height) > 4096 || Math.min(width, height) < 32)
    throw Error("Image dimensions must be between 32 and 4096 px per side.");
}
export async function decodeImage(bytes: ArrayBuffer): Promise<RGB> {
  if (bytes.byteLength > 8 * 1024 * 1024)
    throw Error("Image is larger than 8 MB.");
  const b = new Uint8Array(bytes);
  if (b[0] === 137 && b[1] === 80) {
    if (b.length < 24) throw Error("Image could not be decoded.");
    const header = new DataView(bytes);
    dimensions(header.getUint32(16), header.getUint32(20));
    const png = decodePNG(b, { checkCrc: true });
    const pixels = png.palette ? convertIndexedToRgb(png) : png.data;
    const channels = png.palette
      ? pixels.length / (png.width * png.height)
      : png.channels;
    const out = new Uint8Array(png.width * png.height * 3);
    for (let i = 0; i < png.width * png.height; i++)
      for (let c = 0; c < 3; c++) {
        const x = i % png.width,
          y = Math.floor(i / png.width);
        const v =
          png.depth < 8 && !png.palette
            ? (((pixels[
                y * Math.ceil((png.width * png.depth) / 8) +
                  Math.floor((x * png.depth) / 8)
              ] >>>
                (8 - png.depth - ((x * png.depth) % 8))) &
                ((1 << png.depth) - 1)) *
                255) /
              ((1 << png.depth) - 1)
            : pixels[i * channels + (channels <= 2 ? 0 : c)];
        out[i * 3 + c] =
          png.depth === 16 && !png.palette
            ? channels <= 2
              ? Math.min(255, v)
              : v >>> 8
            : v;
      }
    return { data: out, width: png.width, height: png.height };
  }
  if (b[0] === 255 && b[1] === 216) {
    const jpeg = decodeJPEG(b, {
      useTArray: true,
      formatAsRGBA: false,
      tolerantDecoding: false,
      maxResolutionInMP: 16.8,
      maxMemoryUsageInMB: 192,
    });
    dimensions(jpeg.width, jpeg.height);
    return { data: jpeg.data, width: jpeg.width, height: jpeg.height };
  }
  if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  ) {
    const type = String.fromCharCode(...b.slice(12, 16)),
      d = new DataView(bytes);
    if (b.length < 30) throw Error("Image could not be decoded.");
    const u24 = (o: number) => b[o] + (b[o + 1] << 8) + (b[o + 2] << 16);
    if (type === "VP8X") dimensions(u24(24) + 1, u24(27) + 1);
    else if (type === "VP8L") {
      const v = d.getUint32(21, true);
      dimensions((v & 16383) + 1, ((v >>> 14) & 16383) + 1);
    } else if (type === "VP8 ")
      dimensions(d.getUint16(26, true) & 16383, d.getUint16(28, true) & 16383);
    else throw Error("WebP image header could not be decoded.");
    const { default: decode, init } = await import("@jsquash/webp/decode");
    const url = new URL(
      "../../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm",
      import.meta.url,
    );
    await init({ locateFile: () => url.href });
    const image = await decode(bytes);
    dimensions(image.width, image.height);
    const out = new Uint8Array(image.width * image.height * 3);
    for (let i = 0; i < image.width * image.height; i++)
      for (let c = 0; c < 3; c++) out[i * 3 + c] = image.data[i * 4 + c];
    return { data: out, width: image.width, height: image.height };
  }
  throw Error("Unsupported image type. Use JPEG, PNG or WebP.");
}
