import React, {
  useEffect,
  ComponentType,
  useContext,
  ContextType
} from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import flushPromises from 'flush-promises';

import {
  createPortalProvider,
  createPortalContext
} from './react-portal-provider';

function createStateMonitor(): [
  ComponentType,
  {
    mounted: boolean;
    unmounted: boolean;
    renderCount: number;
  }
] {
  const state = {
    mounted: false,
    unmounted: false,
    renderCount: 0
  };
  return [
    (): null => {
      state.renderCount++;

      useEffect(() => {
        state.mounted = true;
        state.unmounted = false;

        return (): void => {
          state.unmounted = true;
        };
      }, []);

      return null;
    },
    state
  ];
}

describe('PortalProvider', () => {
  const PortalContext = createPortalContext();
  const PortalProvider = createPortalProvider(PortalContext);

  function useCreatePortal(): ContextType<typeof PortalContext>['create'] {
    return useContext(PortalContext).create;
  }

  function useClearPortal(): ContextType<typeof PortalContext>['clear'] {
    return useContext(PortalContext).clear;
  }

  function getCreatePortal() {
    const { result } = renderHook(
      () => {
        return useCreatePortal();
      },
      {
        wrapper: PortalProvider
      }
    );

    return result.current;
  }

  it('should work for whole lifecycle', async () => {
    const createPortal = getCreatePortal();

    const [Component, state] = createStateMonitor();

    await act(async () => {
      expect(state).toEqual({
        mounted: false,
        unmounted: false,
        renderCount: 0
      });

      const modal = createPortal(<Component />);
      // Since createPortal doesn't trigger a rerender of the component where the hook is being used, we cannot use waitForNextUpdate here.
      await flushPromises();

      // mount
      expect(state).toEqual({
        mounted: true,
        unmounted: false,
        renderCount: 1
      });

      // update
      modal.update(<Component />);
      await flushPromises();

      expect(state).toEqual({
        mounted: true,
        unmounted: false,
        renderCount: 2
      });

      // unmount
      modal.unmount();
      await flushPromises();

      expect(state).toEqual({
        mounted: true,
        unmounted: true,
        renderCount: 2
      });
    });
  });

  it('should unmount when another modal is created', async () => {
    const createPortal = getCreatePortal();

    const [Portal1, state1] = createStateMonitor();
    const [Portal2, state2] = createStateMonitor();

    await act(async () => {
      createPortal(<Portal1 />);
      await flushPromises();
      const modal2 = createPortal(<Portal2 />);
      await flushPromises();

      expect(state1).toEqual({
        mounted: true,
        unmounted: true,
        renderCount: 1
      });

      expect(state2).toEqual({
        mounted: true,
        unmounted: false,
        renderCount: 1
      });

      // After modal2 is unmounted, modal1 will be remounted.
      modal2.unmount();
      await flushPromises();
    });

    expect(state1).toEqual({
      mounted: true,
      unmounted: false,
      renderCount: 2
    });

    expect(state2).toEqual({
      mounted: true,
      unmounted: true,
      renderCount: 1
    });
  });

  it('should unmount properly when multiple modals created', async () => {
    const createPortal = getCreatePortal();

    const [Portal1] = createStateMonitor();
    const [Portal2, state2] = createStateMonitor();
    const [Portal3, state3] = createStateMonitor();

    await act(async () => {
      const modal1 = createPortal(<Portal1 />);
      const modal2 = createPortal(<Portal2 />);
      const modal3 = createPortal(<Portal3 />);
      await flushPromises();

      // First, unmount modal1. Since neither modal1 nor modal2 have been mounted yet,
      // we only need to focus on the state of modal3.
      // Unmounting modal1 will not affect the state of modal3.
      modal1.unmount();
      await flushPromises();
      expect(state3.mounted).toBeTruthy();
      expect(state3.unmounted).toBeFalsy();

      // Unmounting modal1 and then updating modal2 after the position of the elements has changed will not affect modal3.
      modal2.update(<Portal2 />);
      await flushPromises();
      expect(state3.renderCount).toBe(1);

      // Then, unmount modal3. At this point, only modal2 remains on the screen.
      // The state then changes to show that modal3 has been unmounted and modal2 has been mounted.
      modal3.unmount();
      await flushPromises();
      expect(state2.mounted).toBeTruthy();
      expect(state2.unmounted).toBeFalsy();
      expect(state3.unmounted).toBeTruthy();

      // Unmount all modals
      modal2.unmount();
      await flushPromises();
      expect(state2.unmounted).toBeTruthy();
      expect(state3.unmounted).toBeTruthy();
    });
  });

  it('should reorder modals is create and update with the same element', async () => {
    const createPortal = getCreatePortal();

    const [Portal1, state1] = createStateMonitor();
    const [Portal2, state2] = createStateMonitor();

    await act(async () => {
      const element1 = <Portal1 />;
      createPortal(element1);
      await flushPromises();
      createPortal(<Portal2 />);
      await flushPromises();

      expect(state1).toEqual({
        mounted: true,
        unmounted: true,
        renderCount: 1
      });

      createPortal(element1);
      await flushPromises();

      expect(state1).toEqual({
        mounted: true,
        unmounted: false,
        renderCount: 2
      });
      expect(state2).toEqual({
        mounted: true,
        unmounted: true,
        renderCount: 1
      });
    });
  });

  it('should not trigger update after unmounted', async () => {
    const createPortal = getCreatePortal();

    const [Component, state] = createStateMonitor();

    await act(async () => {
      const modal = createPortal(<Component />);
      await flushPromises();
      modal.unmount();

      // Any operation after unmounting will not take effect.
      modal.update(<Component />);
      await flushPromises();

      expect(state).toEqual({
        mounted: true,
        unmounted: true,
        renderCount: 1
      });
    });
  });

  it('can be unmounted multiple times', async () => {
    const createPortal = getCreatePortal();

    const [Component, state] = createStateMonitor();

    await act(async () => {
      const modal = createPortal(<Component />);

      await flushPromises();
      modal.unmount();

      await flushPromises();

      modal.unmount();
      await flushPromises();

      expect(state).toEqual({
        mounted: true,
        unmounted: true,
        renderCount: 1
      });
    });
  });

  it('can clear modals', async () => {
    const {
      result: {
        current: { create, clear }
      }
    } = renderHook(
      () => {
        return useContext(PortalContext);
      },
      {
        wrapper: PortalProvider
      }
    );

    const [Component, state] = createStateMonitor();

    await act(async () => {
      create(<Component />);

      await flushPromises();

      clear();

      await flushPromises();

      expect(state.mounted).toBeTruthy();
      expect(state.unmounted).toBeTruthy();
    });
  });

  it('should throw error if hooks are using outside PortalContextProvider', () => {
    const { result: r1 } = renderHook(() => {
      const createPortal = useCreatePortal();
      createPortal(<></>);
    });

    expect(r1.error).toBeInstanceOf(Error);

    const { result: r2 } = renderHook(() => {
      const clearPortal = useClearPortal();
      clearPortal();
    });

    expect(r2.error).toBeInstanceOf(Error);
  });
});
