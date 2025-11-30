import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { componentFocusManager } from './componentFocusManager'
import type { ComponentFocusManager } from './componentFocusManager'

export interface UseComponentFocusOptions {
  /**
   * Unique component key
   */
  componentKey: string
  /**
   * Whether to invalidate all queries on focus
   * @default true
   */
  invalidateOnFocus?: boolean
  /**
   * Whether to refetch active queries on focus
   * @default true
   */
  refetchOnFocus?: boolean
  /**
   * Whether to reset queries on focus
   * @default false
   */
  resetOnFocus?: boolean
  /**
   * Whether to force refetch regardless of staleTime
   * Used with invalidateOnFocus
   * true: refetch even fresh queries
   * false: only refetch stale queries
   * @default true
   */
  forceRefetch?: boolean
  /**
   * Filter to target specific queries
   */
  queryFilter?: {
    queryKey?: Array<unknown>
    predicate?: (query: unknown) => boolean
  }
  /**
   * Custom ComponentFocusManager instance
   */
  focusManager?: ComponentFocusManager
  /**
   * Callback for focus state changes
   */
  onFocusChange?: (focused: boolean) => void
  /**
   * Whether to enable component registration
   * @default true
   */
  enabled?: boolean
}

export interface UseComponentFocusResult {
  /**
   * Current focus state of the component
   */
  isFocused: boolean
  /**
   * Manually set component focus
   */
  setFocus: (focused: boolean) => void
  /**
   * Trigger component focus
   */
  focus: () => void
  /**
   * Blur component
   */
  blur: () => void
  /**
   * Ref to attach to component DOM element
   */
  ref: React.RefObject<HTMLDivElement | null>
}

/**
 * Hook for component-level focus management in MFA environments
 *
 * @example
 * ```tsx
 * function MicroFrontendComponent() {
 *   const { ref, isFocused } = useComponentFocus({
 *     componentKey: 'user-profile',
 *     invalidateOnFocus: true,
 *   })
 *
 *   return (
 *     <div ref={ref}>
 *       {isFocused && <div>Component is focused!</div>}
 *       <UserProfile />
 *     </div>
 *   )
 * }
 * ```
 */
export function useComponentFocus(
  options: UseComponentFocusOptions,
): UseComponentFocusResult {
  const {
    componentKey,
    invalidateOnFocus = true,
    refetchOnFocus = true,
    resetOnFocus = false,
    focusManager = componentFocusManager,
    onFocusChange,
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const elementRef = React.useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)

  // Register component and set up focus listeners
  React.useEffect(() => {
    if (!enabled) return

    // Register component
    const unregister = focusManager.registerComponent(
      componentKey,
      elementRef.current,
      queryClient,
    )

    // Subscribe to focus state changes
    const unsubscribe = focusManager.subscribeToComponent(
      componentKey,
      (focused) => {
        setIsFocused(focused)
        onFocusChange?.(focused)
      },
    )

    return () => {
      unsubscribe()
      unregister()
    }
  }, [componentKey, queryClient, focusManager, onFocusChange, enabled])

  // Update focus management options
  React.useEffect(() => {
    if (!enabled) return

    // Update options if using custom ComponentFocusManager instance
    if (focusManager !== componentFocusManager) {
      // Custom instances receive options at creation time, so no processing here
      return
    }

    // For global instance, handle component-specific options
    // This part needs to be extended to support component-specific options in ComponentFocusManager
  }, [invalidateOnFocus, refetchOnFocus, resetOnFocus, focusManager, enabled])

  const setFocus = React.useCallback(
    (focused: boolean) => {
      if (!enabled) return

      if (focused) {
        focusManager.focusComponent(componentKey)
      } else {
        focusManager.blurComponent(componentKey)
      }
    },
    [componentKey, focusManager, enabled],
  )

  const focus = React.useCallback(() => {
    setFocus(true)
  }, [setFocus])

  const blur = React.useCallback(() => {
    setFocus(false)
  }, [setFocus])

  return {
    isFocused,
    setFocus,
    focus,
    blur,
    ref: elementRef,
  }
}

/**
 * Hook for managing multiple micro-frontend components as a group
 *
 * @example
 * ```tsx
 * function MicroFrontendContainer() {
 *   const { registerComponent, focusGroup, blurGroup } = useComponentFocusGroup({
 *     groupKey: 'dashboard-widgets',
 *     componentKeys: ['widget1', 'widget2', 'widget3'],
 *   })
 *
 *   return (
 *     <div>
 *       <button onClick={focusGroup}>Focus All</button>
 *       <button onClick={blurGroup}>Blur All</button>
 *       {widgets.map(widget => (
 *         <div key={widget.id} ref={registerComponent(widget.id)}>
 *           {widget.content}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export interface UseComponentFocusGroupOptions {
  /**
   * Group key
   */
  groupKey: string
  /**
   * List of component keys to include in the group
   */
  componentKeys: Array<string>
  /**
   * Focus manager instance
   */
  focusManager?: ComponentFocusManager
  /**
   * Callback for group focus changes
   */
  onGroupFocusChange?: (focusedComponents: Array<string>) => void
}

export interface UseComponentFocusGroupResult {
  /**
   * Function to register a component to the group
   */
  registerComponent: (componentKey: string) => React.RefCallback<HTMLElement>
  /**
   * Focus all components in the group
   */
  focusGroup: () => void
  /**
   * Blur all components in the group
   */
  blurGroup: () => void
  /**
   * List of currently focused component keys
   */
  focusedComponentKeys: Array<string>
}

export function useComponentFocusGroup(
  options: UseComponentFocusGroupOptions,
): UseComponentFocusGroupResult {
  const {
    groupKey,
    componentKeys,
    focusManager = componentFocusManager,
    onGroupFocusChange,
  } = options

  const queryClient = useQueryClient()
  const [focusedComponentKeys, setFocusedComponentKeys] = React.useState<
    Array<string>
  >([])
  const componentRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  // Track focus state of each component
  React.useEffect(() => {
    const unsubscribes: Array<() => void> = []

    componentKeys.forEach((componentKey) => {
      const fullComponentKey = `${groupKey}-${componentKey}`

      const unsubscribe = focusManager.subscribeToComponent(
        fullComponentKey,
        (focused) => {
          setFocusedComponentKeys((prev) => {
            const newFocused = focused
              ? [...prev, componentKey].filter(
                  (key, index, self) => self.indexOf(key) === index,
                )
              : prev.filter((key) => key !== componentKey)

            onGroupFocusChange?.(newFocused)
            return newFocused
          })
        },
      )

      unsubscribes.push(unsubscribe)
    })

    return () => {
      unsubscribes.forEach((fn) => fn())
    }
  }, [groupKey, componentKeys, focusManager, onGroupFocusChange])

  const registerComponent = React.useCallback(
    (componentKey: string): React.RefCallback<HTMLElement> => {
      return (element: HTMLElement | null) => {
        const fullComponentKey = `${groupKey}-${componentKey}`

        if (element) {
          componentRefs.current.set(componentKey, element)
          focusManager.registerComponent(fullComponentKey, element, queryClient)
        } else {
          componentRefs.current.delete(componentKey)
          focusManager.unregisterComponent(fullComponentKey)
        }
      }
    },
    [groupKey, queryClient, focusManager],
  )

  const focusGroup = React.useCallback(() => {
    componentKeys.forEach((componentKey) => {
      const fullComponentKey = `${groupKey}-${componentKey}`
      focusManager.focusComponent(fullComponentKey)
    })
  }, [groupKey, componentKeys, focusManager])

  const blurGroup = React.useCallback(() => {
    componentKeys.forEach((componentKey) => {
      const fullComponentKey = `${groupKey}-${componentKey}`
      focusManager.blurComponent(fullComponentKey)
    })
  }, [groupKey, componentKeys, focusManager])

  return {
    registerComponent,
    focusGroup,
    blurGroup,
    focusedComponentKeys,
  }
}
