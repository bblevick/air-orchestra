import { MIDI, type ControlEvent } from "./gestures";
export class Instrument {
  context: AudioContext | null = null;
  oscillator: OscillatorNode | null = null;
  gain: GainNode | null = null;
  filter: BiquadFilterNode | null = null;
  preset: OscillatorType = "sine";
  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.oscillator = this.context.createOscillator();
      this.gain = this.context.createGain();
      this.filter = this.context.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 10000;
      this.gain.gain.value = 0;
      this.oscillator.type = this.preset;
      this.oscillator
        .connect(this.filter)
        .connect(this.gain)
        .connect(this.context.destination);
      this.oscillator.start();
    }
    await this.context.resume();
  }
  setPreset(preset: "sine" | "triangle") {
    this.preset = preset;
    if (this.oscillator) this.oscillator.type = preset;
  }
  apply(e: ControlEvent) {
    if (!this.context || !this.oscillator || !this.gain || !this.filter) return;
    const t = this.context.currentTime;
    this.oscillator.frequency.setTargetAtTime(
      440 * Math.pow(2, (MIDI[e.note] - 69) / 12),
      t,
      0.015,
    );
    this.filter.frequency.setTargetAtTime(
      180 * Math.pow(100, e.filter),
      t,
      0.025,
    );
    this.gain.gain.setTargetAtTime(e.gate ? e.volume * 0.22 : 0, t, 0.02);
  }
  silence() {
    if (this.context && this.gain) {
      this.gain.gain.cancelScheduledValues(this.context.currentTime);
      this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.012);
    }
  }
}
