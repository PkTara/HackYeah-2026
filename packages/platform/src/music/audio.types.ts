/**
 * The parts of the Web Audio API the music engine uses, typed locally so
 * shared code doesn't need the DOM lib (same as webCamera.ts). A real
 * AudioContext or OfflineAudioContext fits these shapes; tests use fakes.
 */

export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
  setTargetAtTime(target: number, time: number, timeConstant: number): unknown;
  cancelScheduledValues(time: number): unknown;
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown;
  disconnect(): void;
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
}

export interface ScheduledSourceLike extends AudioNodeLike {
  start(when: number, offset?: number): void;
  stop(when: number): void;
  onended: (() => void) | null;
}

export interface OscillatorNodeLike extends ScheduledSourceLike {
  type: string;
  readonly frequency: AudioParamLike;
}

export interface BiquadFilterNodeLike extends AudioNodeLike {
  type: string;
  readonly frequency: AudioParamLike;
  readonly Q: AudioParamLike;
}

export interface AudioBufferLike {
  readonly numberOfChannels: number;
  readonly length: number;
  getChannelData(channel: number): Float32Array;
}

export interface AudioBufferSourceNodeLike extends ScheduledSourceLike {
  buffer: AudioBufferLike | null;
}

export interface ConvolverNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  normalize: boolean;
}

export interface DynamicsCompressorNodeLike extends AudioNodeLike {
  readonly threshold: AudioParamLike;
  readonly knee: AudioParamLike;
  readonly ratio: AudioParamLike;
  readonly attack: AudioParamLike;
  readonly release: AudioParamLike;
}

export interface StereoPannerNodeLike extends AudioNodeLike {
  readonly pan: AudioParamLike;
}

/** AudioContext or OfflineAudioContext. */
export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  readonly destination: AudioNodeLike;
  createGain(): GainNodeLike;
  createOscillator(): OscillatorNodeLike;
  createBiquadFilter(): BiquadFilterNodeLike;
  createBufferSource(): AudioBufferSourceNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createConvolver(): ConvolverNodeLike;
  createDynamicsCompressor(): DynamicsCompressorNodeLike;
  /** Missing in some older browsers; the mix is then mono. */
  createStereoPanner?(): StereoPannerNodeLike;
  resume?(): Promise<void>;
  suspend?(): Promise<void>;
}
