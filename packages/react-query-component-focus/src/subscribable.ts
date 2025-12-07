export class Subscribable<TListener extends Function> {
  protected listeners = new Set<TListener>()

  constructor() {
    this.subscribe = this.subscribe.bind(this)
  }

  subscribe(listener: TListener) {
    this.listeners.add(listener)

    this.onSubscribe()

    return () => {
      this.listeners.delete(listener)
      this.onUnsubscribe()
    }
  }

  hasListeners() {
    return this.listeners.size > 0
  }

  protected onSubscribe() {
    // Do nothing
  }

  protected onUnsubscribe() {
    // Do nothing
  }
}
