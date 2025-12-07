import { isServer, noop } from '@tanstack/query-core'
import { Subscribable } from './subscribable'
import type {
  InvalidateQueryFilters,
  QueryClient,
  RefetchQueryFilters,
} from '@tanstack/query-core'

type ComponentListener = (focused: boolean) => void
type ComponentKey = string

interface ComponentFocusState {
  focused: boolean
  queryClient?: QueryClient
  listeners: Set<ComponentListener>
  options?: ComponentFocusManagerOptions
}

export interface ComponentFocusManagerOptions {
  refetchOnFocus?: boolean
  invalidateOnFocus?: boolean
  resetOnFocus?: boolean
  forceRefetch?: boolean
  queryFilters?: InvalidateQueryFilters | RefetchQueryFilters
}

export class ComponentFocusManager extends Subscribable<ComponentListener> {
  #components: Map<ComponentKey, ComponentFocusState> = new Map()
  #globalFocused = true
  #intersectionObservers: Map<ComponentKey, IntersectionObserver> = new Map()
  #mutationObservers: Map<ComponentKey, MutationObserver> = new Map()
  #options: ComponentFocusManagerOptions
  #globalCleanup: (() => void) | null = null

  constructor(options: ComponentFocusManagerOptions = {}) {
    super()
    this.#options = {
      refetchOnFocus: true,
      invalidateOnFocus: true,
      resetOnFocus: false,
      forceRefetch: true,
      ...options,
    }

    this.#globalCleanup = this.setupGlobalFocusListener()
  }

  private setupGlobalFocusListener() {
    if (isServer || typeof document === 'undefined') {
      return null
    }

    const handleVisibilityChange = () => {
      this.#globalFocused = document.visibilityState === 'visible'
      this.notifyAllComponents()
    }

    const handleWindowFocus = () => {
      this.#globalFocused = true
      this.notifyAllComponents()
    }

    const handleWindowBlur = () => {
      this.#globalFocused = false
      this.notifyAllComponents()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }

  destroy() {
    this.#components.forEach((_, componentKey) => {
      this.unregisterComponent(componentKey)
    })

    this.#globalCleanup?.()
    this.#globalCleanup = null
  }

  registerComponent(
    componentKey: ComponentKey,
    element: HTMLElement | null,
    queryClient?: QueryClient,
    componentOptions?: ComponentFocusManagerOptions,
  ) {
    if (!element) {
      console.warn(
        `ComponentFocusManager: Element not found for component ${componentKey}`,
      )
      return noop
    }

    this.unregisterComponent(componentKey)

    const componentState: ComponentFocusState = {
      focused: false,
      queryClient,
      listeners: new Set(),
      options: componentOptions,
    }
    this.#components.set(componentKey, componentState)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isFocused = entry.isIntersecting && this.#globalFocused
          this.setComponentFocus(componentKey, isFocused)
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      },
    )

    intersectionObserver.observe(element)
    this.#intersectionObservers.set(componentKey, intersectionObserver)

    const parentElement = element.parentElement
    if (parentElement) {
      const mutationObserver = new MutationObserver((mutations) => {
        const hasRemovedNodes = mutations.some(
          (mutation) => mutation.removedNodes.length > 0,
        )
        if (hasRemovedNodes && !document.contains(element)) {
          this.unregisterComponent(componentKey)
        }
      })

      mutationObserver.observe(parentElement, {
        childList: true,
        subtree: false,
      })
      this.#mutationObservers.set(componentKey, mutationObserver)
    }

    const handleMouseEnter = () => {
      if (this.#globalFocused) {
        this.setComponentFocus(componentKey, true)
      }
    }

    const handleMouseLeave = () => {
      const rect = element.getBoundingClientRect()
      const isInViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0

      if (!isInViewport) {
        this.setComponentFocus(componentKey, false)
      }
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      this.unregisterComponent(componentKey)
    }
  }

  unregisterComponent(componentKey: ComponentKey) {
    const intersectionObserver = this.#intersectionObservers.get(componentKey)
    if (intersectionObserver) {
      intersectionObserver.disconnect()
      this.#intersectionObservers.delete(componentKey)
    }

    const mutationObserver = this.#mutationObservers.get(componentKey)
    if (mutationObserver) {
      mutationObserver.disconnect()
      this.#mutationObservers.delete(componentKey)
    }

    this.#components.delete(componentKey)
  }

  setComponentFocus(componentKey: ComponentKey, focused: boolean) {
    const component = this.#components.get(componentKey)
    if (!component) return

    const previouslyFocused = component.focused
    component.focused = focused

    if (previouslyFocused !== focused) {
      component.listeners.forEach((listener) => {
        listener(focused)
      })

      if (focused && component.queryClient) {
        this.handleComponentFocus(component.queryClient, component.options)
      }
    }
  }

  private handleComponentFocus(
    queryClient: QueryClient,
    componentOptions?: ComponentFocusManagerOptions,
  ) {
    const options = {
      ...this.#options,
      ...componentOptions,
    }

    const { queryFilters } = options

    if (options.resetOnFocus) {
      queryClient.resetQueries(queryFilters)
      return
    }

    if (options.invalidateOnFocus) {
      const refetchType = options.forceRefetch ? 'all' : 'active'
      queryClient.invalidateQueries({
        ...queryFilters,
        refetchType,
      })
      return
    }

    if (options.refetchOnFocus) {
      queryClient.refetchQueries({
        ...queryFilters,
        type: 'active',
      })
    }
  }

  subscribeToComponent(
    componentKey: ComponentKey,
    listener: ComponentListener,
  ) {
    const component = this.#components.get(componentKey)
    if (!component) {
      console.warn(`Component ${componentKey} is not registered`)
      return noop
    }

    component.listeners.add(listener)
    listener(component.focused)

    return () => {
      component.listeners.delete(listener)
    }
  }

  isComponentFocused(componentKey: ComponentKey) {
    const component = this.#components.get(componentKey)
    return component?.focused ?? false
  }

  isGloballyFocused() {
    return this.#globalFocused
  }

  private notifyAllComponents() {
    if (this.#globalFocused) {
      return
    }

    this.#components.forEach((_, componentKey) => {
      this.setComponentFocus(componentKey, false)
    })
  }

  focusComponent(componentKey: ComponentKey) {
    this.setComponentFocus(componentKey, true)
  }

  blurComponent(componentKey: ComponentKey) {
    this.setComponentFocus(componentKey, false)
  }

  blurAllComponents() {
    this.#components.forEach((_, componentKey) => {
      this.setComponentFocus(componentKey, false)
    })
  }

  getRegisteredComponents() {
    return Array.from(this.#components.keys())
  }

  updateComponentQueryClient(
    componentKey: ComponentKey,
    queryClient: QueryClient,
  ) {
    const component = this.#components.get(componentKey)
    if (!component) {
      return
    }

    component.queryClient = queryClient
  }

  updateComponentOptions(
    componentKey: ComponentKey,
    options: ComponentFocusManagerOptions,
  ) {
    const component = this.#components.get(componentKey)
    if (!component) {
      return
    }

    component.options = {
      ...component.options,
      ...options,
    }
  }
}

export const componentFocusManager = new ComponentFocusManager()

export function createComponentFocusManager(
  options?: ComponentFocusManagerOptions,
) {
  return new ComponentFocusManager(options)
}
