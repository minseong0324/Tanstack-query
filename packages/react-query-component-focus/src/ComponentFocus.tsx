import * as React from 'react'
import { useComponentFocus, useComponentFocusGroup } from './useComponentFocus'
import type {
  UseComponentFocusGroupOptions,
  UseComponentFocusOptions,
} from './useComponentFocus'

/**
 * Props for ComponentFocus component
 */
export interface ComponentFocusProps
  extends Omit<UseComponentFocusOptions, 'enabled'> {
  /**
   * Child elements to manage focus for
   */
  children: React.ReactNode
  /**
   * HTML tag for the container element
   * @default 'div'
   */
  as?: keyof React.JSX.IntrinsicElements
  /**
   * Additional props to pass to the container element
   */
  containerProps?: React.HTMLAttributes<HTMLElement>
  /**
   * Render prop to pass focus state to children
   */
  render?: (props: {
    isFocused: boolean
    focus: () => void
    blur: () => void
    setFocus: (focused: boolean) => void
  }) => React.ReactNode
  /**
   * Whether the component is enabled
   * @default true
   */
  enabled?: boolean
}

/**
 * Component for declarative focus management
 *
 * @example
 * ```tsx
 * <ComponentFocus
 *   componentKey="user-profile"
 *   invalidateOnFocus
 *   onFocusChange={(focused) => console.log('Focus:', focused)}
 * >
 *   <UserProfile />
 * </ComponentFocus>
 * ```
 *
 * @example
 * ```tsx
 * // Render prop pattern
 * <ComponentFocus
 *   componentKey="dashboard"
 *   render={({ isFocused, focus, blur }) => (
 *     <div>
 *       {isFocused && <Badge>Active</Badge>}
 *       <Dashboard />
 *       <button onClick={focus}>Focus</button>
 *     </div>
 *   )}
 * />
 * ```
 */
export function ComponentFocus({
  children,
  as: Component = 'div',
  containerProps = {},
  render,
  enabled = true,
  ...focusOptions
}: ComponentFocusProps) {
  const { ref, isFocused, focus, blur, setFocus } = useComponentFocus({
    ...focusOptions,
    enabled,
  })

  // Render prop pattern
  if (render) {
    return <>{render({ isFocused, focus, blur, setFocus })}</>
  }

  // Default container rendering
  return React.createElement(
    Component,
    {
      ref,
      ...containerProps,
      'data-focused': isFocused,
      'data-component-key': focusOptions.componentKey,
    },
    children,
  )
}

/**
 * Props for ComponentFocusGroup component
 */
export interface ComponentFocusGroupProps
  extends UseComponentFocusGroupOptions {
  /**
   * Children elements to manage as a group
   */
  children: (props: {
    registerComponent: (componentKey: string) => React.RefCallback<HTMLElement>
    focusGroup: () => void
    blurGroup: () => void
    focusedComponentKeys: Array<string>
    isFocused: (componentKey: string) => boolean
  }) => React.ReactNode
}

/**
 * Component for managing multiple components as a group
 *
 * @example
 * ```tsx
 * <ComponentFocusGroup
 *   groupKey="dashboard"
 *   componentKeys={['widget1', 'widget2', 'widget3']}
 * >
 *   {({ registerComponent, focusGroup, blurGroup, focusedComponentKeys }) => (
 *     <>
 *       <button onClick={focusGroup}>Focus All</button>
 *       <button onClick={blurGroup}>Blur All</button>
 *       <div>Focused: {focusedComponentKeys.length}</div>
 *
 *       <div ref={registerComponent('widget1')}>
 *         <Widget1 />
 *       </div>
 *       <div ref={registerComponent('widget2')}>
 *         <Widget2 />
 *       </div>
 *     </>
 *   )}
 * </ComponentFocusGroup>
 * ```
 */
export function ComponentFocusGroup({
  children,
  ...groupOptions
}: ComponentFocusGroupProps) {
  const { registerComponent, focusGroup, blurGroup, focusedComponentKeys } =
    useComponentFocusGroup(groupOptions)

  const isFocused = React.useCallback(
    (componentKey: string) => focusedComponentKeys.includes(componentKey),
    [focusedComponentKeys],
  )

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

/**
 * Conditional focus management component
 */
export interface ConditionalFocusProps extends ComponentFocusProps {
  /**
   * Condition to enable focus management
   */
  when: boolean
  /**
   * Fallback to render when condition is false
   */
  fallback?: React.ReactNode
}

/**
 * Component that conditionally enables focus management
 *
 * @example
 * ```tsx
 * <ConditionalFocus
 *   when={isUserLoggedIn}
 *   componentKey="user-dashboard"
 *   fallback={<LoginPrompt />}
 * >
 *   <UserDashboard />
 * </ConditionalFocus>
 * ```
 */
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

/**
 * Auto focus component
 */
export interface AutoFocusProps extends ComponentFocusProps {
  /**
   * Automatically gain focus on mount
   * @default true
   */
  autoFocus?: boolean
  /**
   * Auto focus delay time (ms)
   * @default 0
   */
  autoFocusDelay?: number
}

/**
 * Component that automatically gains focus on mount
 *
 * @example
 * ```tsx
 * <AutoFocus
 *   componentKey="important-widget"
 *   autoFocusDelay={100}
 * >
 *   <ImportantWidget />
 * </AutoFocus>
 * ```
 */
export function AutoFocus({
  autoFocus = true,
  autoFocusDelay = 0,
  ...focusProps
}: AutoFocusProps) {
  const focusRef = React.useRef<{ focus: () => void } | null>(null)

  return (
    <ComponentFocus
      {...focusProps}
      render={({ isFocused, focus, blur, setFocus }) => {
        focusRef.current = { focus }

        React.useEffect(() => {
          if (autoFocus && focusRef.current) {
            const timer = setTimeout(() => {
              focusRef.current?.focus()
            }, autoFocusDelay)

            return () => clearTimeout(timer)
          }
          return
        }, [autoFocus, autoFocusDelay])

        return (
          focusProps.render?.({ isFocused, focus, blur, setFocus }) ||
          focusProps.children
        )
      }}
    />
  )
}

/**
 * Focus boundary component - propagates focus state to children
 */
export interface FocusBoundaryProps {
  /**
   * Boundary key
   */
  boundaryKey: string
  /**
   * Children elements
   */
  children: React.ReactNode
  /**
   * Whether to propagate focus state to children
   * @default true
   */
  propagate?: boolean
}

// Context for FocusBoundary
const FocusBoundaryContext = React.createContext<{
  boundaryKey: string
  isFocused: boolean
} | null>(null)

/**
 * Sets a focus boundary and propagates focus state to child components
 *
 * @example
 * ```tsx
 * <FocusBoundary boundaryKey="main-content">
 *   <Header />
 *   <MainContent />
 *   <Footer />
 * </FocusBoundary>
 * ```
 */
export function FocusBoundary({
  boundaryKey,
  children,
  propagate = true,
}: FocusBoundaryProps) {
  const { ref, isFocused } = useComponentFocus({
    componentKey: boundaryKey,
    invalidateOnFocus: false, // Boundary doesn't refresh data
  })

  const contextValue = React.useMemo(
    () => ({ boundaryKey, isFocused }),
    [boundaryKey, isFocused],
  )

  return (
    <FocusBoundaryContext.Provider value={propagate ? contextValue : null}>
      <div ref={ref} data-focus-boundary={boundaryKey}>
        {children}
      </div>
    </FocusBoundaryContext.Provider>
  )
}

/**
 * Hook to use focus state within a FocusBoundary
 */
export function useFocusBoundary() {
  const context = React.useContext(FocusBoundaryContext)

  if (!context) {
    throw new Error('useFocusBoundary must be used within a FocusBoundary')
  }

  return context
}
