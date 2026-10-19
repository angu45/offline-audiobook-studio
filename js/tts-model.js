// Neural TTS in the browser (Transformers.js + ONNX/WASM). Returns real audio, so it can be exported.
const LIB = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
let pipe = null, loaded = null;

export const isLoaded = id => loaded === id;

export async function loadModel(id, onProgress) {
  if (loaded === id) return;
  const { pipeline, env } = await import(LIB);
  env.allowLocalModels = false;
  pipe = await pipeline('text-to-speech', id, { progress_callback: onProgress });
  loaded = id;
}

export async function synth(text) {
  const r = await pipe(text);
  const f = r.audio, pcm = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 32767;
  return { pcm, sr: r.sampling_rate };
}
