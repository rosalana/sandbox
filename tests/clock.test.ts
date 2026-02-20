import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Clock from "../src/tools/clock";

// Mock requestAnimationFrame and cancelAnimationFrame since we're in Node
let rafCallbacks: Map<number, (timestamp: number) => void> = new Map();
let nextRafId = 1;

beforeEach(() => {
  rafCallbacks = new Map();
  nextRafId = 1;

  vi.stubGlobal("requestAnimationFrame", (cb: (timestamp: number) => void) => {
    const id = nextRafId++;
    rafCallbacks.set(id, cb);
    return id;
  });

  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });

  vi.stubGlobal("performance", { now: vi.fn(() => 0) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function simulateFrame(timestamp: number) {
  (performance.now as any).mockReturnValue(timestamp);
  const callbacks = Array.from(rafCallbacks.values());
  rafCallbacks.clear();
  callbacks.forEach((cb) => cb(timestamp));
}

// ─── Initial State ──────────────────────────────────────────────────────────

describe("Clock — initial state", () => {
  it("starts with zero values", () => {
    const clock = new Clock();
    const state = clock.getState();
    expect(state.time).toBe(0);
    expect(state.delta).toBe(0);
    expect(state.frame).toBe(0);
    expect(state.running).toBe(false);
    expect(state.fps).toBe(0);
  });
});

// ─── Start / Stop ───────────────────────────────────────────────────────────

describe("Clock — start/stop", () => {
  it("sets running to true on start", () => {
    const clock = new Clock();
    const cb = vi.fn();
    clock.start(cb);
    expect(clock.running).toBe(true);
  });

  it("sets running to false on stop", () => {
    const clock = new Clock();
    clock.start(vi.fn());
    clock.stop();
    expect(clock.running).toBe(false);
  });

  it("calls callback on animation frame", () => {
    const clock = new Clock();
    const cb = vi.fn();
    (performance.now as any).mockReturnValue(0);
    clock.start(cb);

    // Simulate first frame at 16ms
    simulateFrame(16);

    expect(cb).toHaveBeenCalledOnce();
    const state = cb.mock.calls[0][0];
    expect(state.time).toBeCloseTo(0.016, 3);
    expect(state.frame).toBe(1);
    expect(state.running).toBe(true);
  });

  it("does not start twice if already running", () => {
    const clock = new Clock();
    const cb = vi.fn();
    clock.start(cb);
    clock.start(cb); // Second call should be no-op
    expect(clock.running).toBe(true);
  });

  it("stop is no-op when not running", () => {
    const clock = new Clock();
    clock.stop(); // Should not throw
    expect(clock.running).toBe(false);
  });
});

// ─── Time Tracking ──────────────────────────────────────────────────────────

describe("Clock — time tracking", () => {
  it("tracks delta time between frames", () => {
    const clock = new Clock();
    const cb = vi.fn();
    (performance.now as any).mockReturnValue(0);
    clock.start(cb);

    simulateFrame(16);
    expect(cb.mock.calls[0][0].delta).toBeCloseTo(0.016, 3);

    simulateFrame(33);
    expect(cb.mock.calls[1][0].delta).toBeCloseTo(0.017, 3);
  });

  it("tracks frame count", () => {
    const clock = new Clock();
    const cb = vi.fn();
    (performance.now as any).mockReturnValue(0);
    clock.start(cb);

    simulateFrame(16);
    expect(cb.mock.calls[0][0].frame).toBe(1);

    simulateFrame(33);
    expect(cb.mock.calls[1][0].frame).toBe(2);

    simulateFrame(50);
    expect(cb.mock.calls[2][0].frame).toBe(3);
  });

  it("tracks elapsed time", () => {
    const clock = new Clock();
    const cb = vi.fn();
    (performance.now as any).mockReturnValue(0);
    clock.start(cb);

    simulateFrame(1000);
    expect(cb.mock.calls[0][0].time).toBeCloseTo(1.0, 2);

    simulateFrame(2500);
    expect(cb.mock.calls[1][0].time).toBeCloseTo(2.5, 2);
  });
});

// ─── setTime ────────────────────────────────────────────────────────────────

describe("Clock — setTime", () => {
  it("sets time directly", () => {
    const clock = new Clock();
    clock.setTime(5.0);
    expect(clock.getState().time).toBe(5.0);
  });

  it("setTime is chainable", () => {
    const clock = new Clock();
    const result = clock.setTime(1.0);
    expect(result).toBe(clock);
  });
});

// ─── Reset ──────────────────────────────────────────────────────────────────

describe("Clock — reset", () => {
  it("resets all values to zero", () => {
    const clock = new Clock();
    clock.start(vi.fn());
    clock.time = 5;
    clock.frame = 100;
    clock.delta = 0.016;

    clock.reset();

    const state = clock.getState();
    expect(state.time).toBe(0);
    expect(state.delta).toBe(0);
    expect(state.frame).toBe(0);
    expect(state.running).toBe(false);
  });

  it("stops the clock", () => {
    const clock = new Clock();
    clock.start(vi.fn());
    clock.reset();
    expect(clock.running).toBe(false);
  });
});

// ─── Tick ───────────────────────────────────────────────────────────────────

describe("Clock — tick (single frame advance)", () => {
  it("advances by given delta", () => {
    const clock = new Clock();
    const cb = vi.fn();
    clock.start(cb);
    clock.stop();

    clock.tick(0.016);

    expect(clock.time).toBeCloseTo(0.016, 3);
    expect(clock.frame).toBe(1);
    expect(clock.delta).toBeCloseTo(0.016, 3);
  });

  it("calls callback on tick", () => {
    const clock = new Clock();
    const cb = vi.fn();
    clock.start(cb);
    clock.stop();

    clock.tick(0.016);
    expect(cb).toHaveBeenCalled();
  });

  it("accumulates time over multiple ticks", () => {
    const clock = new Clock();
    clock.tick(0.1);
    clock.tick(0.2);
    clock.tick(0.3);

    expect(clock.time).toBeCloseTo(0.6, 5);
    expect(clock.frame).toBe(3);
  });
});

// ─── Max FPS ────────────────────────────────────────────────────────────────

describe("Clock — max FPS", () => {
  it("setMaxFps is chainable", () => {
    const clock = new Clock();
    const result = clock.setMaxFps(30);
    expect(result).toBe(clock);
  });

  it("skips frames when exceeding max FPS", () => {
    const clock = new Clock();
    const cb = vi.fn();
    clock.setMaxFps(30); // ~33ms per frame
    (performance.now as any).mockReturnValue(0);
    clock.start(cb);

    // Frame at 10ms — should be skipped (too early)
    simulateFrame(10);
    expect(cb).not.toHaveBeenCalled();

    // Frame at 34ms — should proceed
    simulateFrame(34);
    expect(cb).toHaveBeenCalledOnce();
  });
});

// ─── Resume Behavior ────────────────────────────────────────────────────────

describe("Clock — resume behavior", () => {
  it("continues time smoothly after pause/resume", () => {
    const clock = new Clock();
    const cb = vi.fn();

    (performance.now as any).mockReturnValue(0);
    clock.start(cb);

    // Run for 1 second
    simulateFrame(1000);
    expect(cb.mock.calls[0][0].time).toBeCloseTo(1.0, 2);

    // Pause
    clock.stop();

    // Resume at a much later wall-clock time
    (performance.now as any).mockReturnValue(5000);
    clock.start(cb);

    // Next frame at 5016ms — should continue from ~1.0s, not 5.0s
    simulateFrame(5016);
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
    expect(lastCall.time).toBeCloseTo(1.016, 2);
  });
});

// ─── Destroy ────────────────────────────────────────────────────────────────

describe("Clock — destroy", () => {
  it("resets and clears callback", () => {
    const clock = new Clock();
    const cb = vi.fn();
    clock.start(cb);
    clock.destroy();

    expect(clock.running).toBe(false);
    expect(clock.time).toBe(0);
    expect(clock.frame).toBe(0);
  });
});
