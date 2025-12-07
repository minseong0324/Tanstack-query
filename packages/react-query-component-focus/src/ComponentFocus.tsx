import * as React from 'react'
import { useComponentFocus } from './useComponentFocus'
import { Slot } from './slot'
import type { UseComponentFocusOptions } from './useComponentFocus'

export interface ComponentFocusProps
  extends Omit<UseComponentFocusOptions, 'enabled'> {
  children?: React.ReactNode
  asChild?: boolean
  render?: (props: {
    isFocused: boolean
    focus: VoidFunction
    blur: VoidFunction
    setFocus: (focused: boolean) => void
    ref: React.RefObject<HTMLElement | null>
  }) => React.ReactNode
  enabled?: boolean
}

export function ComponentFocus({
  children,
  asChild = false,
  render,
  enabled = true,
  ...focusOptions
}: ComponentFocusProps) {
  const { ref, isFocused, focus, blur, setFocus } =
    useComponentFocus<HTMLDivElement>({
      ...focusOptions,
      enabled,
    })

  if (render) {
    return <>{render({ isFocused, focus, blur, setFocus, ref })}</>
  }

  const slotProps = {
    'data-focused': isFocused,
    'data-component-key': focusOptions.componentKey,
  }

  if (asChild) {
    return (
      <Slot slotRef={ref} slotProps={slotProps}>
        {children}
      </Slot>
    )
  }

  return (
    <div ref={ref} {...slotProps}>
      {children}
    </div>
  )
}
