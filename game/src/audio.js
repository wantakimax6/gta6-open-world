// Solara Bay v2 3D sound, made only with WebAudio oscillators and noise.
// Nothing is fetched: every effect is synthesised when it is played, so
// the game stays fully offline. The music is a short 1980s-style synth
// bass line, played quietly under the engine and the police siren.
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = 0;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  const MASTER_VOLUME = 0.22;

  const MUSIC_NOTES = [110, 0, 130.8, 0, 98, 0, 130.8, 146.8, 110, 0, 164.8, 0, 146.8, 130.8, 98, 0];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, seconds, type, volume, slideTo) {
    if (!ensure() || muted) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, context.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + seconds);
      gain.gain.setValueAtTime(volume || 0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(context.currentTime + seconds);
    } catch { /* sound is decoration, never fatal */ }
  }

  function noise(seconds, volume, lowpass) {
    if (!ensure() || muted) return;
    try {
      const length = Math.max(1, Math.floor(context.sampleRate * seconds));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = volume || 0.25;
      let node = source;
      if (lowpass) {
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass;
        source.connect(filter);
        node = filter;
      }
      node.connect(gain);
      gain.connect(master);
      source.start();
    } catch { /* sound is decoration */ }
  }

  function startEngine() {
    if (!ensure() || engineOsc || muted) return;
    try {
      engineOsc = context.createOscillator();
      engineGain = context.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch { engineOsc = null; }
  }

  return {
    unlock() { ensure(); if (context && context.state === 'suspended') context.resume().catch(() => {}); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : MASTER_VOLUME; return muted; },
    isMuted() { return muted; },
    pickup() { tone(660, 0.12, 'sine', 0.25); setTimeout(() => tone(880, 0.16, 'sine', 0.25), 90); },
    jump() { tone(280, 0.14, 'sine', 0.14, 520); },
    coin() { tone(990, 0.1, 'triangle', 0.2); },
    punch() { noise(0.09, 0.3, 900); },
    shoot() { noise(0.14, 0.4, 2400); tone(180, 0.1, 'square', 0.12, 60); },
    crash() { noise(0.3, 0.4, 500); },
    ragdoll() { noise(0.4, 0.35, 700); tone(140, 0.35, 'sawtooth', 0.14, 70); },
    sirenTick(dt, wanted) {
      if (!ensure() || muted || wanted < 1) { if (engineGain) engineGain.gain.value = 0; return; }
      sirenTimer += dt;
      if (sirenTimer > 0.55) {
        sirenTimer = 0;
        tone(700, 0.5, 'sine', 0.07, 950);
      }
    },
    engine(speed01, driving) {
      if (!driving) { if (engineGain) engineGain.gain.value = 0; return; }
      startEngine();
      if (engineOsc && engineGain) {
        engineOsc.frequency.value = 50 + speed01 * 140;
        engineGain.gain.value = 0.03 + speed01 * 0.05;
      }
    },
    missionDone() {
      tone(523, 0.14, 'triangle', 0.25);
      setTimeout(() => tone(659, 0.14, 'triangle', 0.25), 130);
      setTimeout(() => tone(784, 0.28, 'triangle', 0.28), 260);
    },
    busted() { tone(220, 0.5, 'sawtooth', 0.2, 110); },
    music(dt, playing) {
      if (!playing) return;
      musicTimer += dt;
      if (musicTimer < 0.24) return;
      musicTimer = 0;
      const note = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
      musicStep += 1;
      if (note) tone(note, 0.22, 'triangle', 0.06);
    },
  };
}
