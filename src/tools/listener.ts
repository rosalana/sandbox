type EventMap<T extends EventTarget> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLElement
      ? HTMLElementEventMap
      : Record<string, Event>

export default class Listener<
  T extends EventTarget = EventTarget,
  K extends keyof EventMap<T> = keyof EventMap<T>,
> {
  constructor(
    private target: T,
    private type: K,
    private listener: (event: EventMap<T>[K]) => void,
    private options?: boolean | AddEventListenerOptions,
  ) {
    this.target.addEventListener(
      this.type as string,
      this.listener as EventListener,
      this.options,
    )
  }

  public remove() {
    this.target.removeEventListener(
      this.type as string,
      this.listener as EventListener,
      this.options,
    )
  }

  static on<T extends EventTarget, K extends keyof EventMap<T>>(
    target: T,
    type: K,
    listener: (event: EventMap<T>[K]) => void,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type as string, listener as EventListener, options)
    return () =>
      target.removeEventListener(type as string, listener as EventListener, options)
  }
}
