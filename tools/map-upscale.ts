// Upscales a map painting 4× with Real-ESRGAN x4plus (A5), so a detail tile stays sharp at the map's
// close zoom. The model (Qualcomm's ONNX build, BSD-3) takes 128×128 patches; they overlap and
// blend with weights that fall off toward their edges, so no patch seams show. Runs on the CPU.
//   npx tsx tools/map-upscale.ts <in.png> <out.png>
// The model lives in tools/models/ (git-ignored): real_esrgan_x4plus-onnx-float from Qualcomm AI Hub.
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

const MODEL = 'tools/models/real-esrgan/real_esrgan_x4plus-onnx-float/real_esrgan_x4plus.onnx';
const P = 128;
const S = 4;
const STEP = 104;

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: tsx tools/map-upscale.ts <in.png> <out.png>');

const session = await ort.InferenceSession.create(MODEL);
const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const W = w * S;
const H = h * S;
const acc = new Float32Array(W * H * 3);
const wsum = new Float32Array(W * H);

/** Patch origins along one side: every STEP, the last flush with the edge. */
const starts = (n: number) => {
  const out: number[] = [];
  for (let x = 0; x + P < n; x += STEP) out.push(x);
  out.push(Math.max(0, n - P));
  return [...new Set(out)];
};

// A weight that is 1 in the middle of a patch and falls toward its edges.
const ramp = new Float32Array(P * S);
for (let i = 0; i < P * S; i++) {
  const d = Math.min(i + 0.5, P * S - i - 0.5) / (P * S * 0.12);
  ramp[i] = Math.max(0.02, Math.min(1, d));
}

const xs = starts(w);
const ys = starts(h);
const t0 = Date.now();
const patch = new Float32Array(3 * P * P);
for (const [n, py] of ys.entries()) {
  for (const px of xs) {
    for (let y = 0; y < P; y++)
      for (let x = 0; x < P; x++) {
        const sx = Math.min(w - 1, px + x);
        const sy = Math.min(h - 1, py + y);
        const i = (sy * w + sx) * 3;
        for (let c = 0; c < 3; c++) patch[c * P * P + y * P + x] = data[i + c]! / 255;
      }
    const result = await session.run({ image: new ort.Tensor('float32', patch, [1, 3, P, P]) });
    const out = result.upscaled_image!.data as Float32Array;
    const Q = P * S;
    for (let y = 0; y < Q; y++) {
      const oy = py * S + y;
      if (oy >= H) continue;
      for (let x = 0; x < Q; x++) {
        const ox = px * S + x;
        if (ox >= W) continue;
        const wt = ramp[x]! * ramp[y]!;
        const o = oy * W + ox;
        wsum[o]! += wt;
        for (let c = 0; c < 3; c++) acc[o * 3 + c]! += out[c * Q * Q + y * Q + x]! * wt;
      }
    }
  }
  process.stdout.write(`\rrow ${n + 1}/${ys.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const pixels = Buffer.alloc(W * H * 3);
for (let o = 0; o < W * H; o++)
  for (let c = 0; c < 3; c++)
    pixels[o * 3 + c] = Math.max(0, Math.min(255, Math.round((acc[o * 3 + c]! / wsum[o]!) * 255)));
await sharp(pixels, { raw: { width: W, height: H, channels: 3 } })
  .png()
  .toFile(output);
console.log(`\nwrote ${output} (${W}x${H}) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
