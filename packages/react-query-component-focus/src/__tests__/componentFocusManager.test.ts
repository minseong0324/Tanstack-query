import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/query-core'
import { ComponentFocusManager } from '../componentFocusManager'

describe('ComponentFocusManager', () => {
  let manager: ComponentFocusManager
  let element: HTMLDivElement
  let queryClient: QueryClient

  beforeEach(() => {
    manager = new ComponentFocusManager()
    element = document.createElement('div')
    document.body.appendChild(element)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 0,
          gcTime: 0,
        },
      },
    })

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
    document.body.removeChild(element)
    vi.clearAllMocks()
  })

  describe('registerComponent', () => {
    it('should register a component and return a cleanup function', () => {
      const cleanup = manager.registerComponent(
        'test-component',
        element,
        queryClient,
      )

      expect(typeof cleanup).toBe('function')
      expect(manager.getRegisteredComponents()).toContain('test-component')

      cleanup()
      expect(manager.getRegisteredComponents()).not.toContain('test-component')
    })

    it('should warn and return empty cleanup function when element is null', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const cleanup = manager.registerComponent(
        'test-component',
        null,
        queryClient,
      )

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'ComponentFocusManager: Element not found for component test-component',
      )
      expect(typeof cleanup).toBe('function')
      expect(manager.getRegisteredComponents()).not.toContain('test-component')

      consoleWarnSpy.mockRestore()
    })

    it('should cleanup existing component before re-registering', () => {
      manager.registerComponent('test-component', element, queryClient)
      expect(manager.getRegisteredComponents()).toContain('test-component')

      const element2 = document.createElement('div')
      document.body.appendChild(element2)

      const cleanup2 = manager.registerComponent(
        'test-component',
        element2,
        queryClient,
      )
      expect(manager.getRegisteredComponents()).toContain('test-component')
      expect(manager.getRegisteredComponents().length).toBe(1)

      cleanup2()
      document.body.removeChild(element2)
    })
  })

  describe('setComponentFocus', () => {
    it('should set the focus state of a component', () => {
      manager.registerComponent('test-component', element, queryClient)

      expect(manager.isComponentFocused('test-component')).toBe(false)

      manager.setComponentFocus('test-component', true)
      expect(manager.isComponentFocused('test-component')).toBe(true)

      manager.setComponentFocus('test-component', false)
      expect(manager.isComponentFocused('test-component')).toBe(false)
    })

    it('should do nothing for unregistered components', () => {
      manager.setComponentFocus('non-existent', true)
      expect(manager.isComponentFocused('non-existent')).toBe(false)
    })

    it('should call listeners when focus state changes', () => {
      manager.registerComponent('test-component', element, queryClient)

      const listener = vi.fn()
      const unsubscribe = manager.subscribeToComponent(
        'test-component',
        listener,
      )

      // Initial state notification
      expect(listener).toHaveBeenCalledWith(false)
      listener.mockClear()

      // Set focus
      manager.setComponentFocus('test-component', true)
      expect(listener).toHaveBeenCalledWith(true)
      listener.mockClear()

      // Should not call listener when setting same state
      manager.setComponentFocus('test-component', true)
      expect(listener).not.toHaveBeenCalled()

      unsubscribe()
    })

    it('should call invalidateQueries on QueryClient when gaining focus', () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      manager.registerComponent('test-component', element, queryClient)
      manager.setComponentFocus('test-component', true)

      expect(invalidateQueriesSpy).toHaveBeenCalled()
    })
  })

  describe('subscribeToComponent', () => {
    it('should register a listener and immediately notify with current state', () => {
      manager.registerComponent('test-component', element, queryClient)

      const listener = vi.fn()
      const unsubscribe = manager.subscribeToComponent(
        'test-component',
        listener,
      )

      expect(listener).toHaveBeenCalledWith(false)

      unsubscribe()
    })

    it('should warn when subscribing to unregistered component', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const listener = vi.fn()

      const unsubscribe = manager.subscribeToComponent('non-existent', listener)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Component non-existent is not registered',
      )
      expect(listener).not.toHaveBeenCalled()

      unsubscribe() // Should be a no-op function
      consoleWarnSpy.mockRestore()
    })
  })

  describe('focusComponent / blurComponent', () => {
    it('should manually set and unset component focus', () => {
      manager.registerComponent('test-component', element, queryClient)

      expect(manager.isComponentFocused('test-component')).toBe(false)

      manager.focusComponent('test-component')
      expect(manager.isComponentFocused('test-component')).toBe(true)

      manager.blurComponent('test-component')
      expect(manager.isComponentFocused('test-component')).toBe(false)
    })
  })

  describe('blurAllComponents', () => {
    it('should blur all components', () => {
      const element2 = document.createElement('div')
      document.body.appendChild(element2)

      manager.registerComponent('component1', element, queryClient)
      manager.registerComponent('component2', element2, queryClient)

      manager.focusComponent('component1')
      manager.focusComponent('component2')

      expect(manager.isComponentFocused('component1')).toBe(true)
      expect(manager.isComponentFocused('component2')).toBe(true)

      manager.blurAllComponents()

      expect(manager.isComponentFocused('component1')).toBe(false)
      expect(manager.isComponentFocused('component2')).toBe(false)

      document.body.removeChild(element2)
    })
  })

  describe('updateComponentQueryClient', () => {
    it('should update the QueryClient for a component', () => {
      manager.registerComponent('test-component', element, queryClient)

      const newQueryClient = new QueryClient()
      const invalidateQueriesSpy = vi.spyOn(newQueryClient, 'invalidateQueries')

      manager.updateComponentQueryClient('test-component', newQueryClient)
      manager.setComponentFocus('test-component', true)

      expect(invalidateQueriesSpy).toHaveBeenCalled()
    })
  })

  describe('getRegisteredComponents', () => {
    it('should return all registered component IDs', () => {
      const element2 = document.createElement('div')
      const element3 = document.createElement('div')
      document.body.appendChild(element2)
      document.body.appendChild(element3)

      manager.registerComponent('component1', element, queryClient)
      manager.registerComponent('component2', element2, queryClient)
      manager.registerComponent('component3', element3, queryClient)

      const components = manager.getRegisteredComponents()
      expect(components).toHaveLength(3)
      expect(components).toContain('component1')
      expect(components).toContain('component2')
      expect(components).toContain('component3')

      document.body.removeChild(element2)
      document.body.removeChild(element3)
    })
  })

  describe('Custom options', () => {
    it('should call refetchQueries when refetchOnFocus option is true', () => {
      const customManager = new ComponentFocusManager({
        refetchOnFocus: true,
        invalidateOnFocus: false,
      })

      const refetchQueriesSpy = vi.spyOn(queryClient, 'refetchQueries')

      customManager.registerComponent('test-component', element, queryClient)
      customManager.setComponentFocus('test-component', true)

      expect(refetchQueriesSpy).toHaveBeenCalledWith({ type: 'active' })
    })

    it('should call resetQueries when resetOnFocus option is true', () => {
      const customManager = new ComponentFocusManager({
        resetOnFocus: true,
        invalidateOnFocus: false,
      })

      const resetQueriesSpy = vi.spyOn(queryClient, 'resetQueries')

      customManager.registerComponent('test-component', element, queryClient)
      customManager.setComponentFocus('test-component', true)

      expect(resetQueriesSpy).toHaveBeenCalled()
    })
  })

  describe('Global focus state', () => {
    it('should return global focus state', () => {
      expect(manager.isGloballyFocused()).toBe(true)
    })

    it('should respond to visibilitychange event', () => {
      manager.registerComponent('test-component', element, queryClient)
      manager.setComponentFocus('test-component', true)

      expect(manager.isComponentFocused('test-component')).toBe(true)

      // When document becomes hidden, all components should lose focus
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      // notifyAllComponents should be called and focus should be lost
      expect(manager.isGloballyFocused()).toBe(false)
    })
  })
})
