import * as React from 'react'
import { ComponentFocus } from './ComponentFocus'
import type { ComponentFocusProps } from './ComponentFocus'

export interface ConditionalFocusProps extends ComponentFocusProps {
  when: boolean
  fallback?: React.ReactNode
}

export function ConditionalFocus({
  when,
  fallback,
  children,
  ...focusProps
}: ConditionalFocusProps) {
  if (!when) {
    return <>{fallback || children}</>
  }

  return <ComponentFocus {...focusProps}>{children}</ComponentFocus>
}

