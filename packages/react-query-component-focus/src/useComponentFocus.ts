import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { componentFocusManager } from './componentFocusManager'
import type { ComponentFocusManager } from './componentFocusManager'
import type {
  InvalidateQueryFilters,
  RefetchQueryFilters,
} from '@tanstack/query-core'

export interface UseComponentFocusOptions {
  componentKey: string
  invalidateOnFocus?: boolean
  refetchOnFocus?: boolean
  resetOnFocus?: boolean
  forceRefetch?: boolean
  queryFilters?: InvalidateQueryFilters | RefetchQueryFilters
  focusManager?: ComponentFocusManager
  onFocusChange?: (focused: boolean) => void
  enabled?: boolean
}

export interface UseComponentFocusResult<TElement extends HTMLElement> {
  isFocused: boolean
  setFocus: (focused: boolean) => void
  focus: VoidFunction
  blur: VoidFunction
  ref: React.RefObject<TElement | null>
}

export function useComponentFocus<TElement extends HTMLElement = HTMLElement>(
  options: UseComponentFocusOptions,
): UseComponentFocusResult<TElement> {
  const {
    componentKey,
    invalidateOnFocus = true,
    refetchOnFocus = true,
    resetOnFocus = false,
    forceRefetch = true,
    queryFilters,
    focusManager = componentFocusManager,
    onFocusChange,
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const elementRef = React.useRef<TElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
    if (!enabled) {
      return
    }

    const unregister = focusManager.registerComponent(
      componentKey,
      elementRef.current,
      queryClient,
    )

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

  React.useEffect(() => {
    if (!enabled) {
      return
    }

    focusManager.updateComponentOptions(componentKey, {
      invalidateOnFocus,
      refetchOnFocus,
      resetOnFocus,
      forceRefetch,
      queryFilters,
    })
  }, [
    componentKey,
    focusManager,
    enabled,
    invalidateOnFocus,
    refetchOnFocus,
    resetOnFocus,
    forceRefetch,
    queryFilters,
  ])

  const setFocus = React.useCallback(
    (focused: boolean) => {
      if (!enabled) {
        return
      }

      if (focused) {
        focusManager.focusComponent(componentKey)
        return
      }

      focusManager.blurComponent(componentKey)
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
