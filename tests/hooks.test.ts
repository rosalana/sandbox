import { describe, it, expect, vi } from "vitest";
import Hooks from "../src/tools/hooks";
import type { ClockState } from "../src/types";
import { SandboxOnHookCallbackError } from "../src/errors";

const mockState: ClockState = {
  time: 1.0,
  delta: 0.016,
  frame: 60,
  running: true,
  fps: 60,
};

// ─── Basic Hook Operations ──────────────────────────────────────────────────

describe("Hooks — basic operations", () => {
  it("adds and runs a hook", () => {
    const hooks = new Hooks();
    const fn = vi.fn();
    hooks.add(fn);
    hooks.run(mockState);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(mockState);
  });

  it("runs multiple hooks", () => {
    const hooks = new Hooks();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    hooks.add(fn1);
    hooks.add(fn2);
    hooks.add(fn3);

    hooks.run(mockState);

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
    expect(fn3).toHaveBeenCalledOnce();
  });

  it("add returns a removal function", () => {
    const hooks = new Hooks();
    const fn = vi.fn();
    const remove = hooks.add(fn);

    remove();
    hooks.run(mockState);

    expect(fn).not.toHaveBeenCalled();
  });

  it("hook receives correct state", () => {
    const hooks = new Hooks();
    let receivedState: ClockState | null = null;

    hooks.add((state) => {
      receivedState = state;
    });

    hooks.run(mockState);
    expect(receivedState).toEqual(mockState);
  });
});

// ─── Self-removing Hooks ────────────────────────────────────────────────────

describe("Hooks — self-removing hooks", () => {
  it("removes hook when it returns false", () => {
    const hooks = new Hooks();
    const fn = vi.fn().mockReturnValueOnce(false);

    hooks.add(fn);

    hooks.run(mockState);
    expect(fn).toHaveBeenCalledOnce();

    // Second run — hook should be gone
    hooks.run(mockState);
    expect(fn).toHaveBeenCalledOnce(); // Still just once
  });

  it("keeps hook when it returns undefined (void)", () => {
    const hooks = new Hooks();
    const fn = vi.fn(); // Returns undefined by default

    hooks.add(fn);

    hooks.run(mockState);
    hooks.run(mockState);
    hooks.run(mockState);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("self-removing hook based on time condition", () => {
    const hooks = new Hooks();
    let callCount = 0;

    hooks.add((state) => {
      callCount++;
      if (state.time > 5) return false;
    });

    // time = 1.0, should NOT remove
    hooks.run({ ...mockState, time: 1.0 });
    expect(callCount).toBe(1);

    // time = 3.0, should NOT remove
    hooks.run({ ...mockState, time: 3.0 });
    expect(callCount).toBe(2);

    // time = 6.0, should remove itself
    hooks.run({ ...mockState, time: 6.0 });
    expect(callCount).toBe(3);

    // Hook gone — should not increment
    hooks.run({ ...mockState, time: 7.0 });
    expect(callCount).toBe(3);
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

describe("Hooks — error handling", () => {
  it("wraps hook errors in SandboxOnHookCallbackError", () => {
    const hooks = new Hooks();
    hooks.add(() => {
      throw new Error("test error");
    });

    expect(() => hooks.run(mockState)).toThrow(SandboxOnHookCallbackError);
  });

  it("includes error message in wrapped error", () => {
    const hooks = new Hooks();
    hooks.add(() => {
      throw new Error("something went wrong");
    });

    try {
      hooks.run(mockState);
    } catch (e: any) {
      expect(e.message).toContain("something went wrong");
    }
  });
});

// ─── Destroy ────────────────────────────────────────────────────────────────

describe("Hooks — destroy", () => {
  it("removes all hooks on destroy", () => {
    const hooks = new Hooks();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    hooks.add(fn1);
    hooks.add(fn2);

    hooks.destroy();
    hooks.run(mockState);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });
});
