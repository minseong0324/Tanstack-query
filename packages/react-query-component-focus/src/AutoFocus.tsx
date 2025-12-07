import * as React from 'react'
import { ComponentFocus } from './ComponentFocus'
import type { ComponentFocusProps } from './ComponentFocus'

export interface AutoFocusProps extends ComponentFocusProps {
  autoFocus?: boolean
  autoFocusDelay?: number
}

function AutoFocusEffect({
  autoFocus,
  autoFocusDelay,
  focus,
}: {
  autoFocus: boolean
  autoFocusDelay: number
  focus: VoidFunction
}) {
  React.useEffect(() => {
    if (!autoFocus) {
      return
    }

    const timer = setTimeout(() => {
      focus()
    }, autoFocusDelay)

    return () => clearTimeout(timer)
  }, [autoFocus, autoFocusDelay, focus])

  return null
}

export function AutoFocus({
  autoFocus = true,
  autoFocusDelay = 0,
  render,
  children,
  ...focusProps
}: AutoFocusProps) {
  return (
    <ComponentFocus
      {...focusProps}
      render={({ isFocused, focus, blur, setFocus, ref }) => (
        <>
          <AutoFocusEffect
            autoFocus={autoFocus}
            autoFocusDelay={autoFocusDelay}
            focus={focus}
          />
          {render?.({ isFocused, focus, blur, setFocus, ref }) || children}
        </>
      )}
    />
  )
}
