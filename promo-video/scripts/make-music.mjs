import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Original 8-bar progression, 64 BPM. No samples or third-party recordings.
const rate = 44100;
const seconds = 30;
const samples = new Float64Array(rate * seconds * 2);
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
function note(midi, start, duration, amp, pan = 0) {
  const frequency = hz(midi);
  const offset = Math.round(start * rate);
  for (let i = 0; i < Math.min(Math.round(duration * rate), rate * seconds - offset); i++) {
    const t = i / rate;
    const attack = Math.min(1, t / 0.012);
    const release = Math.min(1, (duration - t) / 0.28);
    const envelope = attack * release * Math.exp(-t * 1.5);
    const tone = Math.sin(2 * Math.PI * frequency * t) + 0.28 * Math.sin(2 * Math.PI * frequency * 2.002 * t) * Math.exp(-t * 2.3) + 0.07 * Math.sin(2 * Math.PI * frequency * 3 * t) * Math.exp(-t * 3);
    samples[(offset + i) * 2] += tone * envelope * amp * (1 - pan * 0.25);
    samples[(offset + i) * 2 + 1] += tone * envelope * amp * (1 + pan * 0.25);
  }
}
const beat = 60 / 64;
const chords = [[48, 55, 60, 64], [43, 55, 59, 62], [45, 52, 57, 60], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62], [41, 53, 57, 60], [48, 55, 60, 64]];
const melody = [76, 74, 72, 71, 72, 76, 77, 76, 74, 71, 72, 76, 77, 74, 72, 72];
chords.forEach((chord, bar) => {
  const start = bar * 4 * beat;
  note(chord[0], start, 3.3, 0.11, -0.2);
  for (let step = 0; step < 8; step++) note(chord[1 + step % 3], start + step * beat / 2, 2.2, 0.075, step % 2 ? 0.5 : -0.5);
  note(melody[bar * 2], start + beat * 0.4, 2.5, 0.085, 0.15);
  note(melody[bar * 2 + 1], start + beat * 2.4, 2.5, 0.08, -0.15);
});
// Quiet stereo echoes; the final seconds fade to silence.
const dry = samples.slice();
for (const [delay, gain] of [[0.16, 0.13], [0.33, 0.09], [0.51, 0.055]]) {
  const d = Math.round(delay * rate) * 2;
  for (let i = d; i < samples.length; i++) samples[i] += dry[i - d] * gain;
}
const peak = samples.reduce((max, n) => Math.max(max, Math.abs(n)), 0);
const output = Buffer.alloc(44 + samples.length * 2);
output.write('RIFF', 0); output.writeUInt32LE(output.length - 8, 4); output.write('WAVEfmt ', 8);
output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(2, 22);
output.writeUInt32LE(rate, 24); output.writeUInt32LE(rate * 4, 28); output.writeUInt16LE(4, 32); output.writeUInt16LE(16, 34);
output.write('data', 36); output.writeUInt32LE(samples.length * 2, 40);
for (let i = 0; i < samples.length; i++) {
  const time = i / 2 / rate;
  const fade = Math.max(0, Math.min(1, time / 0.8, (seconds - time) / 2.2));
  output.writeInt16LE(Math.round(samples[i] / peak * 0.64 * fade * 32767), 44 + i * 2);
}
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/music.wav');
fs.mkdirSync(path.dirname(target), {recursive:true});
fs.writeFileSync(target, output);
console.log(`Original music: ${seconds}s, stereo ${rate}Hz → ${target}`);
