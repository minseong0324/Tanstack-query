import * as React from 'react'

export function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref != null) {
        ref.current = node
      }
    })
  }
}

export interface SlotProps {
  children: React.ReactNode
  slotRef: React.Ref<HTMLElement>
  slotProps: Record<string, unknown>
}

export function Slot({ children, slotRef, slotProps }: SlotProps) {
  if (!React.isValidElement(children)) {
    console.warn(
      'ComponentFocus: asChild requires a single React element child',
    )
    return <>{children}</>
  }

  const childRef = (children as { ref?: React.Ref<HTMLElement> }).ref
  const childProps = children.props as Record<string, unknown>

  return React.cloneElement(children, {
    ...slotProps,
    ...childProps,
    ref: mergeRefs(slotRef, childRef),
  } as React.Attributes)
}

