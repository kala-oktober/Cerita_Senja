// Original 72 BPM lo-fi loop: soft keys, bass, melody, and a swung drum beat.
// Render once into an audio buffer so playback continues without timer scheduling.
const soundButton = document.getElementById('sound-toggle');
const volume = document.getElementById('volume');
let audioContext, master, loop;

async function createLofiLoop() {
  const beat = 60 / 72;
  const duration = beat * 32;
  const sampleRate = 44100;
  const render = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const warmth = render.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = 4200;
  warmth.Q.value = 0.4;
  const compressor = render.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  warmth.connect(compressor).connect(render.destination);

  function note(midi, start, length, level, type = 'sine') {
    const tone = render.createOscillator();
    const envelope = render.createGain();
    tone.type = type;
    tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(level, start + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    tone.connect(envelope).connect(warmth);
    tone.start(start);
    tone.stop(start + length);
  }

  const noise = render.createBuffer(1, sampleRate / 4, sampleRate);
  const samples = noise.getChannelData(0);
  let seed = 19;
  for (let i = 0; i < samples.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    samples[i] = seed / 2147483648 - 1;
  }
  function percussion(start, snare) {
    const source = render.createBufferSource();
    const filter = render.createBiquadFilter();
    const envelope = render.createGain();
    source.buffer = noise;
    filter.type = snare ? 'bandpass' : 'highpass';
    filter.frequency.value = snare ? 1700 : 5500;
    envelope.gain.setValueAtTime(snare ? 0.17 : 0.065, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + (snare ? 0.16 : 0.045));
    source.connect(filter).connect(envelope).connect(warmth);
    source.start(start);
    source.stop(start + 0.2);
    if (snare) note(50, start, 0.09, 0.05, 'triangle');
  }
  function kick(start) {
    const tone = render.createOscillator();
    const envelope = render.createGain();
    tone.frequency.setValueAtTime(115, start);
    tone.frequency.exponentialRampToValueAtTime(45, start + 0.13);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.28, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    tone.connect(envelope).connect(warmth);
    tone.start(start);
    tone.stop(start + 0.31);
  }

  const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [55, 59, 62, 69]];
  const melodies = [[76, 74, 72], [72, 69, 67], [71, 72, 76], [74, 71, 69],
    [72, 76, 79], [76, 72, 69], [67, 71, 74], [74, 71, 69]];
  for (let bar = 0; bar < 8; bar++) {
    const start = bar * beat * 4 + 0.015;
    const chord = chords[bar % 4];
    for (const hit of [0, 2.5]) {
      chord.forEach((pitch, i) => {
        const time = start + hit * beat + i * 0.009;
        note(pitch, time, beat * 1.2, 0.085, 'triangle');
        note(pitch + 12, time, beat * 0.7, 0.012);
      });
    }
    note(chord[0] - 12, start, beat * 1.4, 0.18);
    note(chord[0] - 12, start + beat * 2, beat * 1.4, 0.14);
    melodies[bar].forEach((pitch, i) => note(pitch, start + [0.5, 1.75, 3][i] * beat, beat * 0.65, 0.075));
    kick(start);
    kick(start + 2.5 * beat);
    percussion(start + beat, true);
    percussion(start + 3 * beat, true);
    for (let step = 0; step < 8; step++) percussion(start + (step * 0.5 + (step % 2 ? 0.075 : 0)) * beat, false);
  }
  return render.startRendering();
}

soundButton.addEventListener('click', async () => {
  soundButton.disabled = true;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      master = audioContext.createGain();
      master.gain.value = 0;
      master.connect(audioContext.destination);
    }
    const playing = soundButton.getAttribute('aria-pressed') === 'true';
    if (playing) {
      await audioContext.suspend();
    } else {
      await audioContext.resume();
      if (!loop) {
        soundButton.textContent = 'Menyiapkan lo-fi...';
        const buffer = await createLofiLoop();
        loop = audioContext.createBufferSource();
        loop.buffer = buffer;
        loop.loop = true;
        loop.connect(master);
        loop.start();
      }
      master.gain.setTargetAtTime(Number(volume.value) / 100, audioContext.currentTime, 0.15);
    }
    soundButton.setAttribute('aria-pressed', String(!playing));
    soundButton.textContent = playing ? '\u266b Putar lo-fi' : '\u2161 Jeda lo-fi';
    document.getElementById('sound-status').textContent = '';
  } catch {
    document.getElementById('sound-status').textContent = 'Musik belum bisa diputar di browser ini.';
    soundButton.textContent = 'Coba putar lagi';
  } finally {
    soundButton.disabled = false;
  }
});
volume.addEventListener('input', () => {
  if (master) master.gain.setTargetAtTime(Number(volume.value) / 100, audioContext.currentTime, 0.15);
});
