import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  ComponentFocus,
  ComponentFocusGroup,
  ConditionalFocus,
  AutoFocus,
  FocusBoundary,
  useFocusBoundary,
} from '../ComponentFocus'
import {
  ComponentFocusManager,
  componentFocusManager,
} from '../componentFocusManager'

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('ComponentFocus', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: () => [],
    }))

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <ComponentFocus componentKey="test">
        <span data-testid="child">Child Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('child').textContent).toBe('Child Content')
  })

  it('should render with default div container', () => {
    render(
      <ComponentFocus componentKey="test">
        <span>Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    const container = screen.getByText('Content').parentElement
    expect(container?.tagName).toBe('DIV')
  })

  it('should render with custom element via as prop', () => {
    render(
      <ComponentFocus componentKey="test" as="section">
        <span data-testid="content">Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    const container = screen.getByTestId('content').parentElement
    expect(container?.tagName).toBe('SECTION')
  })

  it('should add data attributes to container', () => {
    render(
      <ComponentFocus componentKey="my-component">
        <span data-testid="content">Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    const container = screen.getByTestId('content').parentElement
    expect(container?.getAttribute('data-component-key')).toBe('my-component')
    expect(container?.getAttribute('data-focused')).toBe('false')
  })

  it('should pass containerProps to container element', () => {
    render(
      <ComponentFocus
        componentKey="test"
        containerProps={{
          className: 'custom-class',
          'aria-label': 'Focus container',
        }}
      >
        <span data-testid="content">Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    const container = screen.getByTestId('content').parentElement
    expect(container?.className).toBe('custom-class')
    expect(container?.getAttribute('aria-label')).toBe('Focus container')
  })

  it('should call onFocusChange when focus state changes', async () => {
    const onFocusChange = vi.fn()

    render(
      <ComponentFocus componentKey="callback-test" onFocusChange={onFocusChange}>
        <span>Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    act(() => {
      componentFocusManager.focusComponent('callback-test')
    })

    await waitFor(() => {
      expect(onFocusChange).toHaveBeenCalledWith(true)
    })
  })

  it('should use render prop pattern when render is provided', () => {
    render(
      <ComponentFocus
        componentKey="render-prop-test"
        render={({ isFocused, focus, blur }) => (
          <div data-testid="render-container">
            <span data-testid="focus-status">
              {isFocused ? 'Focused' : 'Blurred'}
            </span>
            <button data-testid="focus-btn" onClick={focus}>
              Focus
            </button>
            <button data-testid="blur-btn" onClick={blur}>
              Blur
            </button>
          </div>
        )}
      />,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('render-container')).toBeInTheDocument()
    expect(screen.getByTestId('focus-status').textContent).toBe('Blurred')
    expect(screen.getByTestId('focus-btn')).toBeInTheDocument()
    expect(screen.getByTestId('blur-btn')).toBeInTheDocument()
  })

  it('should not register when enabled is false', () => {
    const focusManager = new ComponentFocusManager()

    render(
      <ComponentFocus
        componentKey="disabled-test"
        enabled={false}
        focusManager={focusManager}
      >
        <span>Content</span>
      </ComponentFocus>,
      { wrapper: createWrapper() },
    )

    expect(focusManager.getRegisteredComponents()).not.toContain('disabled-test')
  })
})

describe('ComponentFocusGroup', () => {
  let focusManager: ComponentFocusManager

  beforeEach(() => {
    focusManager = new ComponentFocusManager()

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: () => [],
    }))

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render children with render props', () => {
    render(
      <ComponentFocusGroup
        groupKey="test-group"
        componentKeys={['a', 'b']}
        focusManager={focusManager}
      >
        {({ registerComponent }) => (
          <div>
            <div ref={registerComponent('a')} data-testid="item-a">
              Item A
            </div>
            <div ref={registerComponent('b')} data-testid="item-b">
              Item B
            </div>
          </div>
        )}
      </ComponentFocusGroup>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('item-a')).toBeInTheDocument()
    expect(screen.getByTestId('item-b')).toBeInTheDocument()
  })

  it('should provide focusGroup and blurGroup functions', () => {
    let capturedFocusGroup: (() => void) | null = null
    let capturedBlurGroup: (() => void) | null = null

    render(
      <ComponentFocusGroup
        groupKey="test-group"
        componentKeys={['a']}
        focusManager={focusManager}
      >
        {({ focusGroup, blurGroup }) => {
          capturedFocusGroup = focusGroup
          capturedBlurGroup = blurGroup
          return <div>Content</div>
        }}
      </ComponentFocusGroup>,
      { wrapper: createWrapper() },
    )

    expect(typeof capturedFocusGroup).toBe('function')
    expect(typeof capturedBlurGroup).toBe('function')
  })

  it('should provide isFocused helper function', () => {
    render(
      <ComponentFocusGroup
        groupKey="test-group"
        componentKeys={['widget1', 'widget2']}
        focusManager={focusManager}
      >
        {({ registerComponent, isFocused }) => (
          <div>
            <div ref={registerComponent('widget1')}>
              <span data-testid="status-1">
                {isFocused('widget1') ? 'focused' : 'blurred'}
              </span>
            </div>
            <div ref={registerComponent('widget2')}>
              <span data-testid="status-2">
                {isFocused('widget2') ? 'focused' : 'blurred'}
              </span>
            </div>
          </div>
        )}
      </ComponentFocusGroup>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('status-1').textContent).toBe('blurred')
    expect(screen.getByTestId('status-2').textContent).toBe('blurred')
  })

  it('should initialize focusedComponentKeys as empty array', () => {
    render(
      <ComponentFocusGroup
        groupKey="dashboard"
        componentKeys={['widget1', 'widget2']}
        focusManager={focusManager}
      >
        {({ registerComponent, focusedComponentKeys }) => (
          <div>
            <span data-testid="count">{focusedComponentKeys.length}</span>
            <div ref={registerComponent('widget1')}>Widget 1</div>
            <div ref={registerComponent('widget2')}>Widget 2</div>
          </div>
        )}
      </ComponentFocusGroup>,
      { wrapper: createWrapper() },
    )

    // Initially all components should be unfocused
    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})

describe('ConditionalFocus', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: () => [],
    }))

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render children with focus management when condition is true', () => {
    render(
      <ConditionalFocus when={true} componentKey="conditional-test">
        <span data-testid="content">Protected Content</span>
      </ConditionalFocus>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
    // Should be wrapped in a container with data attributes
    const container = screen.getByTestId('content').parentElement
    expect(container?.getAttribute('data-component-key')).toBe('conditional-test')
  })

  it('should render children without focus management when condition is false', () => {
    render(
      <ConditionalFocus when={false} componentKey="conditional-test">
        <span data-testid="content">Content</span>
      </ConditionalFocus>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
    // Should NOT be wrapped in a container with data attributes
    const container = screen.getByTestId('content').parentElement
    expect(container?.getAttribute('data-component-key')).toBeNull()
  })

  it('should render fallback when condition is false and fallback is provided', () => {
    render(
      <ConditionalFocus
        when={false}
        componentKey="conditional-test"
        fallback={<span data-testid="fallback">Login Required</span>}
      >
        <span data-testid="content">Protected Content</span>
      </ConditionalFocus>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
})

describe('AutoFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: () => [],
    }))

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <AutoFocus componentKey="auto-focus-test">
        <span data-testid="content">Auto Focus Content</span>
      </AutoFocus>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('should support autoFocusDelay option', () => {
    const focusManager = new ComponentFocusManager()
    const focusSpy = vi.spyOn(focusManager, 'focusComponent')

    render(
      <AutoFocus
        componentKey="delayed-focus"
        autoFocusDelay={500}
        focusManager={focusManager}
      >
        <span>Content</span>
      </AutoFocus>,
      { wrapper: createWrapper() },
    )

    // Focus should not be called immediately
    expect(focusSpy).not.toHaveBeenCalled()

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Focus should be called after delay
    expect(focusSpy).toHaveBeenCalledWith('delayed-focus')
  })

  it('should not auto focus when autoFocus is false', () => {
    const focusManager = new ComponentFocusManager()
    const focusSpy = vi.spyOn(focusManager, 'focusComponent')

    render(
      <AutoFocus
        componentKey="no-auto-focus"
        autoFocus={false}
        focusManager={focusManager}
      >
        <span>Content</span>
      </AutoFocus>,
      { wrapper: createWrapper() },
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(focusSpy).not.toHaveBeenCalled()
  })
})

describe('FocusBoundary', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: () => [],
    }))

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: () => [],
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render children within a boundary', () => {
    render(
      <FocusBoundary boundaryKey="main-content">
        <span data-testid="child">Child Content</span>
      </FocusBoundary>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should add data-focus-boundary attribute', () => {
    render(
      <FocusBoundary boundaryKey="sidebar">
        <span data-testid="child">Content</span>
      </FocusBoundary>,
      { wrapper: createWrapper() },
    )

    const container = screen.getByTestId('child').parentElement
    expect(container?.getAttribute('data-focus-boundary')).toBe('sidebar')
  })

  it('should provide context to children via useFocusBoundary', () => {
    function ChildComponent() {
      const { boundaryKey, isFocused } = useFocusBoundary()
      return (
        <div>
          <span data-testid="boundary-key">{boundaryKey}</span>
          <span data-testid="is-focused">{isFocused ? 'yes' : 'no'}</span>
        </div>
      )
    }

    render(
      <FocusBoundary boundaryKey="test-boundary">
        <ChildComponent />
      </FocusBoundary>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('boundary-key').textContent).toBe('test-boundary')
    expect(screen.getByTestId('is-focused').textContent).toBe('no')
  })

  it('should throw error when useFocusBoundary is used outside FocusBoundary', () => {
    function InvalidComponent() {
      useFocusBoundary()
      return <div>Should not render</div>
    }

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<InvalidComponent />, { wrapper: createWrapper() })
    }).toThrow('useFocusBoundary must be used within a FocusBoundary')

    consoleSpy.mockRestore()
  })

  it('should not provide context when propagate is false', () => {
    function ChildComponent() {
      try {
        useFocusBoundary()
        return <span data-testid="result">Has Context</span>
      } catch {
        return <span data-testid="result">No Context</span>
      }
    }

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <FocusBoundary boundaryKey="no-propagate" propagate={false}>
        <ChildComponent />
      </FocusBoundary>,
      { wrapper: createWrapper() },
    )

    expect(screen.getByTestId('result').textContent).toBe('No Context')

    consoleSpy.mockRestore()
  })
})

