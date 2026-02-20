import { SandboxOnHookCallbackError } from "../errors";
import { ClockState, HookCallback } from "../types";

export default class Hooks {
  private hooks: Map<string, HookCallback> = new Map();

  private id(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /** Add a new hook, returns a removal function */
  public add(hook: HookCallback): () => void {
    const id = this.id();
    this.hooks.set(id, hook);
    return () => this.remove(id);
  }

  /** Remove a hook by its ID */
  public remove(id: string): void {
    this.hooks.delete(id);
  }

  /** Run all hooks with the given state */
  public run(state: ClockState): void {
    for (const [id, hook] of this.hooks) {
      try {
        if (hook(state) === false) {
          this.remove(id);
        }
      } catch (error) {
        throw new SandboxOnHookCallbackError(
          id,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  public destroy(): void {
    this.hooks.clear();
  }
}
