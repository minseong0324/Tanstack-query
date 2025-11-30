import { isServer } from '@tanstack/query-core'
import { Subscribable } from './subscribable'
import type { QueryClient } from '@tanstack/query-core';

type ComponentListener = (focused: boolean) => void
type ComponentKey = string

interface ComponentFocusState {
  focused: boolean
  queryClient?: QueryClient
  listeners: Set<ComponentListener>
}

export interface ComponentFocusManagerOptions {
  refetchOnFocus?: boolean
  invalidateOnFocus?: boolean
  resetOnFocus?: boolean
  /**
   * Whether to force refetch regardless of staleTime
   * true: refetch even fresh queries
   * false: refetch only stale queries (default)
   */
  forceRefetch?: boolean
  /**
   * Query filter to target specific queries
   */
  queryFilter?: {
    queryKey?: Array<unknown>
    predicate?: (query: unknown) => boolean
  }
}

/**
 * ComponentFocusManager manages the focus state of each micro-frontend component
 * in MFA environments and automatically invalidates or refetches queries when focus changes.
 */
export class ComponentFocusManager extends Subscribable<ComponentListener> {
  #components: Map<ComponentKey, ComponentFocusState> = new Map()
  #globalFocused = true
  #intersectionObservers: Map<ComponentKey, IntersectionObserver> = new Map()
  #mutationObservers: Map<ComponentKey, MutationObserver> = new Map()
  #options: ComponentFocusManagerOptions

  constructor(options: ComponentFocusManagerOptions = {}) {
    super()
    this.#options = {
      refetchOnFocus: true,
      invalidateOnFocus: true,
      resetOnFocus: false,
      forceRefetch: true, // Default: refetch even fresh queries
      ...options,
    }

    // Setup global focus event listeners
    this.setupGlobalFocusListener()
  }

  private setupGlobalFocusListener(): void {
    if (!isServer && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        this.#globalFocused = document.visibilityState === 'visible'
        this.notifyAllComponents()
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Also add window focus events
      const handleWindowFocus = () => {
        this.#globalFocused = true
        this.notifyAllComponents()
      }
      
      const handleWindowBlur = () => {
        this.#globalFocused = false
        this.notifyAllComponents()
      }

      window.addEventListener('focus', handleWindowFocus)
      window.addEventListener('blur', handleWindowBlur)
    }
  }

  /**
   * Register a component and start focus management
   */
  registerComponent(
    componentKey: ComponentKey,
    element: HTMLElement | null,
    queryClient?: QueryClient,
  ): () => void {
    if (!element) {
      console.warn(`ComponentFocusManager: Element not found for component ${componentKey}`)
      return () => {}
    }

    // Clean up existing component if any
    this.unregisterComponent(componentKey)

    // Initialize component state
    const componentState: ComponentFocusState = {
      focused: false,
      queryClient,
      listeners: new Set(),
    }
    this.#components.set(componentKey, componentState)

    // Detect component visibility using IntersectionObserver
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isFocused = entry.isIntersecting && this.#globalFocused
          this.setComponentFocus(componentKey, isFocused)
        })
      },
      {
        threshold: 0.1, // Consider focused when 10% or more is visible
        rootMargin: '0px',
      }
    )

    intersectionObserver.observe(element)
    this.#intersectionObservers.set(componentKey, intersectionObserver)

    // Detect DOM changes using MutationObserver (when component is removed)
    const mutationObserver = new MutationObserver(() => {
      if (!document.contains(element)) {
        this.unregisterComponent(componentKey)
      }
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
    this.#mutationObservers.set(componentKey, mutationObserver)

    // Detect focus through mouse hover events (optional)
    const handleMouseEnter = () => {
      if (this.#globalFocused) {
        this.setComponentFocus(componentKey, true)
      }
    }

    const handleMouseLeave = () => {
      // Keep focus if still in viewport even when mouse leaves
      const rect = element.getBoundingClientRect()
      const isInViewport = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      )
      
      if (!isInViewport) {
        this.setComponentFocus(componentKey, false)
      }
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    // Return cleanup function
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      this.unregisterComponent(componentKey)
    }
  }

  /**
   * Unregister a component
   */
  unregisterComponent(componentKey: ComponentKey): void {
    // Clean up observers
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

    // Remove component state
    this.#components.delete(componentKey)
  }

  /**
   * Set focus state for a specific component
   */
  setComponentFocus(componentKey: ComponentKey, focused: boolean): void {
    const component = this.#components.get(componentKey)
    if (!component) return

    const previouslyFocused = component.focused
    component.focused = focused

    // Only process when focus state changes
    if (previouslyFocused !== focused) {
      // Call component-specific listeners
      component.listeners.forEach((listener) => {
        listener(focused)
      })

      // Handle queries when component gains focus
      if (focused && component.queryClient) {
        this.handleComponentFocus(component.queryClient)
      }
    }
  }

  /**
   * Handle queries when component gains focus
   */
  private handleComponentFocus(queryClient: QueryClient): void {
    const queryFilter = this.#options.queryFilter

    if (this.#options.invalidateOnFocus) {
      if (this.#options.forceRefetch) {
        // Force refetch even fresh queries
        queryClient.invalidateQueries({
          ...queryFilter,
          refetchType: 'all', // 'all' refetches even fresh queries
        })
      } else {
        // Only refetch stale queries (default behavior)
        queryClient.invalidateQueries({
          ...queryFilter,
          refetchType: 'active', // 'active' only refetches stale and active queries
        })
      }
    } else if (this.#options.refetchOnFocus) {
      // refetchQueries always forces refetch (regardless of stale status)
      queryClient.refetchQueries({
        ...queryFilter,
        type: 'active',
      })
    }

    if (this.#options.resetOnFocus) {
      // Reset query cache (remove all data and refetch)
      queryClient.resetQueries(queryFilter)
    }
  }

  /**
   * Subscribe to component-specific listeners
   */
  subscribeToComponent(
    componentKey: ComponentKey,
    listener: ComponentListener,
  ): () => void {
    const component = this.#components.get(componentKey)
    if (!component) {
      console.warn(`Component ${componentKey} is not registered`)
      return () => {}
    }

    component.listeners.add(listener)

    // Immediately notify current focus state
    listener(component.focused)

    // Return unsubscribe function
    return () => {
      component.listeners.delete(listener)
    }
  }

  /**
   * Check focus state of a specific component
   */
  isComponentFocused(componentKey: ComponentKey): boolean {
    const component = this.#components.get(componentKey)
    return component?.focused ?? false
  }

  /**
   * Check global focus state
   */
  isGloballyFocused(): boolean {
    return this.#globalFocused
  }

  /**
   * Notify all components of focus state change
   */
  private notifyAllComponents(): void {
    this.#components.forEach((_, componentKey) => {
      // Unfocus all components when global focus is lost
      if (!this.#globalFocused) {
        this.setComponentFocus(componentKey, false)
      }
    })
  }

  /**
   * Manually trigger focus for a specific component
   */
  focusComponent(componentKey: ComponentKey): void {
    this.setComponentFocus(componentKey, true)
  }

  /**
   * Manually blur a specific component
   */
  blurComponent(componentKey: ComponentKey): void {
    this.setComponentFocus(componentKey, false)
  }

  /**
   * Blur all components
   */
  blurAllComponents(): void {
    this.#components.forEach((_, componentKey) => {
      this.setComponentFocus(componentKey, false)
    })
  }

  /**
   * Get all registered component keys
   */
  getRegisteredComponents(): Array<ComponentKey> {
    return Array.from(this.#components.keys())
  }

  /**
   * Update QueryClient for a component
   */
  updateComponentQueryClient(
    componentKey: ComponentKey,
    queryClient: QueryClient,
  ): void {
    const component = this.#components.get(componentKey)
    if (component) {
      component.queryClient = queryClient
    }
  }
}

// Singleton instance
export const componentFocusManager = new ComponentFocusManager()

// Export for creating custom instances
export function createComponentFocusManager(
  options?: ComponentFocusManagerOptions,
): ComponentFocusManager {
  return new ComponentFocusManager(options)
}
