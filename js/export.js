// Real audio encoders. Input is mono 16-bit PCM (Int16Array) from a synthesizer that returns audio data.
const LAME = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
const tick = () => new Promise(r => setTimeout(r));

export function concat(clips, sr, pauseMs) {
  const gap = Math.round(sr * pauseMs / 1000);
  const total = clips.reduce((n, c) => n + c.length, 0) + gap * Math.max(0, clips.length - 1);
  const out = new Int16Array(total);
  let o = 0;
  clips.forEach((c, i) => { out.set(c, o); o += c.length + (i < clips.length - 1 ? gap : 0); });
  return out;
}

export function toWav(pcm, sr) {
  const b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(b, 44).set(pcm);
  return new Blob([b], { type: 'audio/wav' });
}

function loadLame() {
  if (window.lamejs) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = LAME; s.onload = res;
    s.onerror = () => rej(new Error('Could not load the MP3 encoder. Check your connection.'));
    document.head.append(s);
  });
}

export async function toMp3(pcm, sr, onProgress) {
  await loadLame();
  const enc = new window.lamejs.Mp3Encoder(1, sr, 64), parts = [], N = 1152 * 20;
  for (let i = 0, n = 0; i < pcm.length; i += N, n++) {
    const d = enc.encodeBuffer(pcm.subarray(i, i + N));
    if (d.length) parts.push(d);
    if (n % 25 === 0) { onProgress(Math.round(i / pcm.length * 100)); await tick(); }
  }
  const f = enc.flush(); if (f.length) parts.push(f);
  return new Blob(parts, { type: 'audio/mpeg' });
}

// Opus via MediaRecorder: encodes in real time, so a 10-minute clip takes 10 minutes.
export async function toOpus(pcm, sr) {
  const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!mime) throw new Error('This browser cannot record Opus audio.');
  const ctx = new AudioContext(), buf = ctx.createBuffer(1, pcm.length, sr), ch = buf.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
  const dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource();
  src.buffer = buf; src.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: mime }), parts = [];
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const done = new Promise(r => { rec.onstop = r; });
  rec.start(); src.start(); src.onended = () => rec.stop();
  await done; ctx.close();
  return new Blob(parts, { type: mime.split(';')[0] });
}
