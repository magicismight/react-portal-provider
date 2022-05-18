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
      // 这里不能用 waitForNextUpdate，因为 createPortal 不会导致当前 hook 所在组件 rerender
      await flushPromises();

      // 首次渲染
      expect(state).toEqual({
        mounted: true,
        unmounted: false,
        renderCount: 1
      });

      // 更新
      modal.update(<Component />);
      await flushPromises();

      expect(state).toEqual({
        mounted: true,
        unmounted: false,
        renderCount: 2
      });

      // 卸载
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

      // modal2 unmount 之后 modal1 会重新 mount
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

      // 首先先把 modal1 unmount 了，由于前面 modal1 和 modal2 都没有被 mount，
      // 所以这里只需要关注 modal3 的状态，
      // modal1 的 unmount 不会影响 modal3 的状态
      modal1.unmount();
      await flushPromises();
      expect(state3.mounted).toBeTruthy();
      expect(state3.unmounted).toBeFalsy();

      // 删除 modal1，元素位置变更后再对 modal2 进行更新，不会影响到 modal3
      modal2.update(<Portal2 />);
      await flushPromises();
      expect(state3.renderCount).toBe(1);

      // 随后再 unmount modal3 ，目前只剩下 modal2 还留在界面上,
      // 随后状态变为 modal3 被 unmount，modal2 mount
      modal3.unmount();
      await flushPromises();
      expect(state2.mounted).toBeTruthy();
      expect(state2.unmounted).toBeFalsy();
      expect(state3.unmounted).toBeTruthy();

      // unmount 所有 modal
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

      // unmount 之后的任何操作都不会生效
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
