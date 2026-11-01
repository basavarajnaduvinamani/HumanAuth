import sharp from "sharp";
for (const page of [
  "landing",
  "verify",
  "how-it-works",
  "evidence",
  "about",
  "404",
]) {
  const pieces = [];
  let height = 0;
  for (const [i, [width, theme]] of [
    [1440, "light"],
    [390, "light"],
    [1440, "dark"],
    [390, "dark"],
  ].entries()) {
    const { data, info } = await sharp(
      `screenshots/${page}-${width}-${theme}.png`,
    )
      .resize({ width: 360, height: 2200, fit: "inside" })
      .png()
      .toBuffer({ resolveWithObject: true });
    height = Math.max(height, info.height);
    pieces.push({ input: data, left: i * 376, top: 24 });
  }
  await sharp({
    create: {
      width: 1504,
      height: height + 48,
      channels: 3,
      background: "#bfc6bf",
    },
  })
    .composite(pieces)
    .png()
    .toFile(`../.overnight/${page}-review.png`);
}
