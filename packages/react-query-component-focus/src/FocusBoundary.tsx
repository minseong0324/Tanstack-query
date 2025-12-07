import * as React from 'react'
import { useComponentFocus } from './useComponentFocus'

export interface FocusBoundaryProps {
  boundaryKey: string
  children: (props: {
    ref: React.RefObject<HTMLElement | null>
    isFocused: boolean
  }) => React.ReactNode
  propagate?: boolean
}

const FocusBoundaryContext = React.createContext<{
  boundaryKey: string
  isFocused: boolean
} | null>(null)

export function FocusBoundary({
  boundaryKey,
  children,
  propagate = true,
}: FocusBoundaryProps) {
  const { ref, isFocused } = useComponentFocus({
    componentKey: boundaryKey,
    invalidateOnFocus: false,
  })

  const contextValue = React.useMemo(
    () => ({ boundaryKey, isFocused }),
    [boundaryKey, isFocused],
  )

  return (
    <FocusBoundaryContext.Provider value={propagate ? contextValue : null}>
      {children({ ref, isFocused })}
    </FocusBoundaryContext.Provider>
  )
}

export function useFocusBoundary() {
  const context = React.useContext(FocusBoundaryContext)

  if (!context) {
    throw new Error('useFocusBoundary must be used within a FocusBoundary')
  }

  return context
}

