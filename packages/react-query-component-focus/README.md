# @tanstack/react-query-component-focus

Component-level visibility-based query management for TanStack Query.

# Quick Features

- Visibility-based focus tracking using IntersectionObserver
- Automatic query invalidation when components enter viewport
- Group management for related components
- Works with multiple QueryClient instances
- Respects browser visibility state (tab switching, window blur)

# Quick Start

1. Install `react-query-component-focus`

   ```bash
   $ npm i @tanstack/react-query-component-focus
   ```

   or

   ```bash
   $ pnpm add @tanstack/react-query-component-focus
   ```

   or

   ```bash
   $ yarn add @tanstack/react-query-component-focus
   ```

2. Use the hook

   ```tsx
   import { useComponentFocus } from '@tanstack/react-query-component-focus'

   function Dashboard() {
     const { ref, isFocused } = useComponentFocus({
       componentKey: 'dashboard',
       invalidateOnFocus: true,
     })

     return (
       <div ref={ref}>
         <DashboardContent />
       </div>
     )
   }
   ```

3. Or use the component

   ```tsx
   import { ComponentFocus } from '@tanstack/react-query-component-focus'

   function Dashboard() {
     return (
       <ComponentFocus componentKey="dashboard" invalidateOnFocus>
         <DashboardContent />
       </ComponentFocus>
     )
   }
   ```

# API

## Hooks

### useComponentFocus

```tsx
const { ref, isFocused, focus, blur } = useComponentFocus({
  componentKey: 'unique-key',
  invalidateOnFocus: true,
  refetchOnFocus: true,
  forceRefetch: true,
  onFocusChange: (focused) => {},
})
```

### useComponentFocusGroup

```tsx
const { registerComponent, focusGroup, blurGroup, focusedComponentKeys } =
  useComponentFocusGroup({
    groupKey: 'dashboard',
    componentKeys: ['widget1', 'widget2'],
  })
```

## Components

### ComponentFocus

```tsx
<ComponentFocus componentKey="widget" invalidateOnFocus>
  <Widget />
</ComponentFocus>
```

### ComponentFocusGroup

```tsx
<ComponentFocusGroup
  groupKey="dashboard"
  componentKeys={['widget1', 'widget2']}
>
  {({ registerComponent }) => (
    <div ref={registerComponent('widget1')}>
      <Widget1 />
    </div>
  )}
</ComponentFocusGroup>
```

### FocusBoundary

```tsx
<FocusBoundary boundaryKey="main-content">
  {({ ref, isFocused }) => (
    <section ref={ref}>
      <Content />
    </section>
  )}
</FocusBoundary>
```

### ConditionalFocus

```tsx
<ConditionalFocus
  when={isLoggedIn}
  componentKey="dashboard"
  fallback={<LoginPrompt />}
>
  <Dashboard />
</ConditionalFocus>
```

### AutoFocus

```tsx
<AutoFocus componentKey="notification" autoFocusDelay={500}>
  <NotificationBanner />
</AutoFocus>
```
