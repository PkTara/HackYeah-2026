/**
 * Incremental smoothing for live signals.
 *
 * A running median over the last few values removes single-frame spikes (a
 * wrist that jumps for one frame) without rounding off real movement, at the
 * cost of a frame or two of delay. The same idea as the offline median filter
 * in vision-demos (chin_ups/src/reps.py), done one value at a time.
 */
export class RunningMedian {
  private values: number[] = [];

  /** `size` is forced odd so the median is always one of the values. */
  constructor(private readonly size = 3) {
    if (size < 1) {
      throw new Error('RunningMedian size must be at least 1');
    }
    this.size = size % 2 === 0 ? size + 1 : size;
  }

  /** Adds a value and returns the current median. NaN values are ignored. */
  push(value: number): number {
    if (Number.isFinite(value)) {
      this.values.push(value);
      if (this.values.length > this.size) {
        this.values.shift();
      }
    }
    return this.current();
  }

  /** The median so far, or NaN before any value. */
  current(): number {
    if (this.values.length === 0) {
      return NaN;
    }
    const sorted = [...this.values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  reset(): void {
    this.values = [];
  }
}

/** Median of a list, NaN when empty. */
export function median(values: readonly number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) {
    return NaN;
  }
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
