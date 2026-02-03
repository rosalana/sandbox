import type { ClockState, HookCallback } from "../types";

/**
 * High-precision animation timing using requestAnimationFrame.
 * Tracks elapsed time, delta time, and frame count.
 */
export default class Clock {
  /** Total elapsed time in seconds */
  time = 0;
  /** Delta time since last frame in seconds */
  delta = 0;
  /** Frame counter */
  frame = 0;
  /** Is clock running */
  running = false;
  /** Smoothed frames per second */
  fps = 0;

  private startTime = 0;
  private lastTime = 0;
  private rafId: number | null = null;
  private callback: HookCallback | null = null;
  private maxFps = 0;

  constructor() {
    // Bind loop method to preserve 'this' context
    this.loop = this.loop.bind(this);
  }

  /**
   * Start the animation loop with a render callback.
   */
  start(callback: HookCallback): this {
    if (this.running) return this;

    this.callback = callback;
    this.running = true;

    const now = performance.now();

    if (this.frame === 0) {
      // Fresh start
      this.startTime = now;
    } else {
      // Resume from paused state
      this.startTime = now - this.time * 1000;
    }
    this.lastTime = now;

    // Start the loop
    this.rafId = requestAnimationFrame(this.loop);

    return this;
  }

  /**
   * Stop the animation loop.
   * Clock state is preserved for resume.
   */
  stop(): this {
    if (!this.running) return this;

    this.running = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    return this;
  }

  /**
   * Reset clock to initial state.
   */
  reset(): this {
    this.stop();
    this.time = 0;
    this.delta = 0;
    this.frame = 0;
    this.fps = 0;
    return this;
  }

  /**
   * Get current clock state snapshot.
   */
  getState(): ClockState {
    return {
      time: this.time,
      delta: this.delta,
      frame: this.frame,
      running: this.running,
      fps: Math.round(this.fps),
    };
  }

  /**
   * Advance clock by one tick (for single-shot rendering).
   * Useful when autoplay is disabled.
   */
  tick(dt = 0): this {
    this.delta = dt;
    this.time += dt;
    this.frame++;

    if (this.callback) {
      this.callback(this.getState());
    }

    return this;
  }

  /**
   * Set time directly (for deterministic rendering).
   */
  setTime(time: number): this {
    this.time = time;
    return this;
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    this.reset();
    this.callback = null;
  }

  /**
   * Set maximum frames per second.
   */
  setMaxFps(fps: number): this {
    this.maxFps = fps;
    return this;
  }

  /**
   * Internal animation frame handler.
   */
  private loop(timestamp: number): void {
    if (!this.running) return;

    // Skip frame if maxFps is set and we haven't reached the minimum frame time
    if (this.maxFps > 0) {
      const minFrameTime = 1000 / this.maxFps;
      if (timestamp - this.lastTime < minFrameTime) {
        this.rafId = requestAnimationFrame(this.loop);
        return;
      }
    }

    // Calculate delta time in seconds
    this.delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Smoothed FPS (exponential moving average)
    const instantFps = this.delta > 0 ? 1 / this.delta : 0;
    this.fps = this.fps * 0.95 + instantFps * 0.05;

    // Calculate total elapsed time in seconds
    this.time = (timestamp - this.startTime) / 1000;

    // Increment frame counter
    this.frame++;

    // Call render callback
    if (this.callback) {
      this.callback(this.getState());
    }

    // Schedule next frame
    this.rafId = requestAnimationFrame(this.loop);
  }
}
