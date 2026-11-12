/**
 * Blade sounds from the OpenCore OEM sound font (public/sounds, 44.1 kHz mono): power-on, then a few
 * seconds of the looping hum that fade out, and power-off.
 */
const MUTE_KEY = 'saberWorkshop.muted';
const VOLUME = 0.45;
/** How long the hum keeps going after ignition, then how long it takes to fade out (s). */
const HUM_HOLD = 2.5;
const HUM_FADE = 1.5;

type SoundName = 'poweron' | 'hum' | 'poweroff';
const NAMES: SoundName[] = ['poweron', 'hum', 'poweroff'];

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* not remembered */
  }
  if (muted) stopAll(0.05);
}

/** The files are fetched once the page has loaded (no audio context needed yet); decoded on first use. */
let files: Promise<Record<SoundName, ArrayBuffer>> | null = null;
function fetchFiles() {
  files ??= Promise.all(
    NAMES.map((n) => fetch(`${import.meta.env.BASE_URL}sounds/${n}.wav`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))),
  ).then((bufs) => Object.fromEntries(NAMES.map((n, i) => [n, bufs[i]])) as Record<SoundName, ArrayBuffer>);
  return files;
}
if (typeof window !== 'undefined') window.addEventListener('load', () => void fetchFiles().catch(() => (files = null)), { once: true });

let ctx: AudioContext | null = null;
let buffers: Promise<Record<SoundName, AudioBuffer>> | null = null;

/** The audio context can only start from a user gesture, so it is made on the first play. */
function audio(): { a: AudioContext; sounds: Promise<Record<SoundName, AudioBuffer>> } | null {
  if (!ctx) {
    if (!window.AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  const a = ctx;
  buffers ??= fetchFiles().then(async (raw) => {
    // decodeAudioData takes ownership of the bytes, so decode copies (the fetch result stays reusable).
    const decoded = await Promise.all(NAMES.map((n) => a.decodeAudioData(raw[n].slice(0))));
    return Object.fromEntries(NAMES.map((n, i) => [n, decoded[i]])) as Record<SoundName, AudioBuffer>;
  });
  buffers.catch(() => (buffers = null));
  return { a, sounds: buffers };
}

/** Whatever is playing now, each with its own gain so it can be faded out. */
let playing: { source: AudioBufferSourceNode; gain: GainNode }[] = [];

function stopAll(fade: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const { source, gain } of playing) {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + fade);
    source.stop(t + fade + 0.01);
  }
  playing = [];
}

function play(a: AudioContext, buffer: AudioBuffer, at: number, loop = false) {
  const source = a.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  const gain = a.createGain();
  gain.gain.value = VOLUME;
  source.connect(gain).connect(a.destination);
  source.start(at);
  const entry = { source, gain };
  playing.push(entry);
  source.onended = () => (playing = playing.filter((p) => p !== entry));
  return entry;
}

export function playIgnition() {
  const audioCtx = !isMuted() && audio();
  if (!audioCtx) return;
  const { a, sounds } = audioCtx;
  void sounds.then((s) => {
    stopAll(0.04);
    const t = a.currentTime + 0.01;
    play(a, s.poweron, t);
    // The hum takes over as the power-on ends, keeps going a moment, then fades away.
    const humStart = t + s.poweron.duration - 0.08;
    const hum = play(a, s.hum, humStart, true);
    hum.gain.gain.setValueAtTime(0, humStart);
    hum.gain.gain.linearRampToValueAtTime(VOLUME, humStart + 0.08);
    hum.gain.gain.setValueAtTime(VOLUME, humStart + HUM_HOLD);
    hum.gain.gain.linearRampToValueAtTime(0, humStart + HUM_HOLD + HUM_FADE);
    hum.source.stop(humStart + HUM_HOLD + HUM_FADE + 0.05);
  });
}

export function playRetraction() {
  const audioCtx = !isMuted() && audio();
  if (!audioCtx) return;
  const { a, sounds } = audioCtx;
  void sounds.then((s) => {
    stopAll(0.06);
    play(a, s.poweroff, a.currentTime + 0.01);
  });
}
