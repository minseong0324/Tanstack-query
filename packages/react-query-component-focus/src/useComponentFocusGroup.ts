import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { componentFocusManager } from './componentFocusManager'
import type { ComponentFocusManager } from './componentFocusManager'

export interface UseComponentFocusGroupOptions {
  groupKey: string
  componentKeys: Array<string>
  focusManager?: ComponentFocusManager
  onGroupFocusChange?: (focusedComponents: Array<string>) => void
}

export interface UseComponentFocusGroupResult {
  registerComponent: (componentKey: string) => React.RefCallback<HTMLElement>
  focusGroup: VoidFunction
  blurGroup: VoidFunction
  focusedComponentKeys: Array<string>
}

export function useComponentFocusGroup(options: UseComponentFocusGroupOptions) {
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
      return (element) => {
        const fullComponentKey = `${groupKey}-${componentKey}`

        if (!element) {
          componentRefs.current.delete(componentKey)
          focusManager.unregisterComponent(fullComponentKey)
          return
        }

        componentRefs.current.set(componentKey, element)
        focusManager.registerComponent(fullComponentKey, element, queryClient)
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
