import * as React from 'react'
import { useComponentFocusGroup } from './useComponentFocusGroup'
import type { UseComponentFocusGroupOptions } from './useComponentFocusGroup'

export interface ComponentFocusGroupProps
  extends UseComponentFocusGroupOptions {
  children: (props: {
    registerComponent: (componentKey: string) => React.RefCallback<HTMLElement>
    focusGroup: VoidFunction
    blurGroup: VoidFunction
    focusedComponentKeys: Array<string>
    isFocused: (componentKey: string) => boolean
  }) => React.ReactNode
}

export function ComponentFocusGroup({
  children,
  ...groupOptions
}: ComponentFocusGroupProps) {
  const { registerComponent, focusGroup, blurGroup, focusedComponentKeys } =
    useComponentFocusGroup(groupOptions)

  const isFocused = (componentKey: string) =>
    focusedComponentKeys.includes(componentKey)

  return (
    <>
      {children({
        registerComponent,
        focusGroup,
        blurGroup,
        focusedComponentKeys,
        isFocused,
      })}
    </>
  )
}
