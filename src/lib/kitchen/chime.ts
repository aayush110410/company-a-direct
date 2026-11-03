"use client";

/**
 * Two-tone chime for a new ticket, synthesised with Web Audio (no asset to load).
 * Browsers only allow sound after a tap, so the shift-start overlay calls unlock().
 */
let ctx: AudioContext | null = null;

export const chime = {
  unlock() {
    ctx ??= new AudioContext();
    void ctx.resume();
  },
  play() {
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    for (const [i, freq] of [880, 1318.5].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.35, t + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.16);
      osc.stop(t + i * 0.16 + 0.5);
    }
  },
};
