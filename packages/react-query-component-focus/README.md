# @tanstack/react-query-component-focus

Component-level visibility-based query management for TanStack Query.

## 🎯 Overview

This package provides **component-level focus management** for TanStack Query. It automatically invalidates or refetches queries when components become visible in the viewport, enabling efficient data synchronization based on user attention.

### Use Cases

- **Multi-QueryClient environments**: Applications with multiple independent QueryClient instances
- **Tab/Panel interfaces**: Refresh data when users switch between tabs or panels
- **Lazy-loaded sections**: Fetch fresh data only when sections become visible
- **Dashboard widgets**: Update widget data based on viewport visibility
- **Infinite scroll layouts**: Manage query lifecycle for visible components
- **Modal/Dialog content**: Refresh content when modals open

## ✨ Features

- 🔍 **Visibility-based focus tracking** using IntersectionObserver
- 🔄 **Automatic query invalidation** when components enter viewport
- 🎯 **Group management** for related components
- 🎨 **Declarative JSX components** and hooks
- 🚀 **Zero dependencies** (except TanStack Query)
- 📦 **Tree-shakeable** and lightweight

## 📦 Installation

```bash
npm install @tanstack/react-query-component-focus
# or
yarn add @tanstack/react-query-component-focus
# or
pnpm add @tanstack/react-query-component-focus
```

## 🚀 Quick Start

### Using Hooks

```tsx
import { useComponentFocus } from '@tanstack/react-query-component-focus'

function Dashboard() {
  const { ref, isFocused } = useComponentFocus({
    componentKey: 'user-dashboard',
    invalidateOnFocus: true,
  })

  return (
    <div ref={ref}>
      {isFocused && <Badge>Active</Badge>}
      <DashboardContent />
    </div>
  )
}
```

### Using JSX Components

```tsx
import { ComponentFocus } from '@tanstack/react-query-component-focus'

function Dashboard() {
  return (
    <ComponentFocus
      componentKey="user-dashboard"
      invalidateOnFocus
      onFocusChange={(focused) => console.log('Focus:', focused)}
    >
      <DashboardContent />
    </ComponentFocus>
  )
}
```

## 📖 API Reference

### Hooks

#### `useComponentFocus`

Manages focus state for a single component.

```tsx
const {
  ref, // Ref to attach to the component
  isFocused, // Current focus state
  focus, // Manual focus function
  blur, // Manual blur function
  setFocus, // Set focus state
} = useComponentFocus(options)
```

**Options:**

- `componentKey`: Unique identifier for the component
- `invalidateOnFocus`: Invalidate queries when focused (default: `true`)
- `refetchOnFocus`: Refetch active queries when focused (default: `true`)
- `resetOnFocus`: Reset queries when focused (default: `false`)
- `forceRefetch`: Refetch even fresh queries (default: `true`)
- `queryFilter`: Filter to target specific queries
- `onFocusChange`: Callback when focus state changes

#### `useComponentFocusGroup`

Manages focus state for a group of components.

```tsx
const {
  registerComponent, // Register a component to the group
  focusGroup, // Focus all components
  blurGroup, // Blur all components
  focusedComponentKeys, // Currently focused component keys
} = useComponentFocusGroup(options)
```

### Components

#### `<ComponentFocus>`

Basic focus management component.

```tsx
<ComponentFocus
  componentKey="unique-key"
  invalidateOnFocus={true}
  refetchOnFocus={false}
  forceRefetch={true}
  onFocusChange={(focused) => {}}
>
  <YourComponent />
</ComponentFocus>
```

#### `<ComponentFocusGroup>`

Group management component.

```tsx
<ComponentFocusGroup
  groupKey="dashboard"
  componentKeys={['widget1', 'widget2']}
>
  {({ registerComponent, focusGroup, blurGroup }) => (
    <>
      <button onClick={focusGroup}>Focus All</button>
      <div ref={registerComponent('widget1')}>
        <Widget1 />
      </div>
    </>
  )}
</ComponentFocusGroup>
```

#### `<ConditionalFocus>`

Conditionally enable focus management.

```tsx
<ConditionalFocus
  when={isUserLoggedIn}
  componentKey="protected-content"
  fallback={<LoginPrompt />}
>
  <ProtectedContent />
</ConditionalFocus>
```

#### `<AutoFocus>`

Automatically focus on mount.

```tsx
<AutoFocus componentKey="notification" autoFocusDelay={500}>
  <NotificationPanel />
</AutoFocus>
```

#### `<FocusBoundary>`

Create a focus boundary that propagates focus state to children.

```tsx
<FocusBoundary boundaryKey="main-section">
  <Header />
  <Content />
  <Footer />
</FocusBoundary>
```

## 🏗️ How It Works

1. **Visibility Detection**: Uses `IntersectionObserver` to detect when components enter/leave the viewport
2. **Focus State Management**: Tracks which components are currently "focused" (visible)
3. **Query Lifecycle**: Automatically invalidates or refetches queries when components gain focus
4. **Global Awareness**: Respects browser visibility state (tab switching, window blur)

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Your Application                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────┐  ┌────────────────┐        │
│  │  Component A   │  │  Component B   │        │
│  │  ┌──────────┐  │  │  ┌──────────┐  │        │
│  │  │  Query   │  │  │  │  Query   │  │        │
│  │  │  Client  │  │  │  │  Client  │  │        │
│  │  └──────────┘  │  │  └──────────┘  │        │
│  │       ↓        │  │       ↓        │        │
│  │  Focus Hook    │  │  Focus Hook    │        │
│  └────────────────┘  └────────────────┘        │
│            ↑                ↑                  │
│            └────────────────┘                  │
│         ComponentFocusManager                  │
│      (IntersectionObserver-based)              │
└─────────────────────────────────────────────────┘
```

## ⚙️ Configuration

### Global Configuration

```tsx
import { createComponentFocusManager } from '@tanstack/react-query-component-focus'

const focusManager = createComponentFocusManager({
  invalidateOnFocus: true,
  refetchOnFocus: false,
  forceRefetch: true,
  queryFilter: {
    queryKey: ['user'],
  },
})
```

### Per-Component Configuration

```tsx
useComponentFocus({
  componentKey: 'dashboard',
  invalidateOnFocus: true,
  forceRefetch: true,
  queryFilter: {
    predicate: (query) => query.state.dataUpdatedAt < Date.now() - 60000,
  },
})
```

## 🔮 Future Framework Support

While this package is React-specific, the core `ComponentFocusManager` can be adapted for other frameworks:

- `@tanstack/vue-query-component-focus` - Vue.js support
- `@tanstack/solid-query-component-focus` - SolidJS support
- `@tanstack/svelte-query-component-focus` - Svelte support
- `@tanstack/angular-query-component-focus` - Angular support

The core logic in `componentFocusManager.ts` is framework-agnostic and can be reused.

## 📄 License

MIT © TanStack
