import React, { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react-hooks';

import { useSafeState } from './use-safe-state';

describe('useSafeState', () => {
  it('should initial with state', () => {
    const { result } = renderHook(() => useSafeState('a'));
    const [state] = result.current;
    expect(state).toBe('a');
  });

  it('should initial with callback', () => {
    const callback = jest.fn(() => 'a');
    const { result } = renderHook(() => useSafeState(callback));
    const [state] = result.current;
    expect(state).toBe('a');
    expect(callback).toBeCalledTimes(1);
  });

  it('should setState like useState', () => {
    const { result, rerender } = renderHook(() => useSafeState('a'));
    const [, setState] = result.current;

    // setState with state
    act(() => {
      setState('b');
      rerender();
    });

    const [state1] = result.current;

    expect(state1).toBe('b');

    // setState with callback
    const callback = jest.fn(() => 'c');
    act(() => {
      setState(callback);
      rerender();
    });

    const [state2] = result.current;
    expect(state2).toBe('c');
    expect(callback).toBeCalledTimes(1);
    // setState callback called with last state
    expect(callback).toBeCalledWith('b');
  });

  it('should always return the same setState', () => {
    const { result, rerender } = renderHook(() => useSafeState('a'));

    const [, setState1] = result.current;

    rerender();
    const [, setState2] = result.current;

    expect(setState1).toBe(setState2);
  });

  it('should update component after other component rendered', () => {
    const ref: { current: string | null } = { current: null };
    let renderCount = 0;
    const ChildComponent = function (props: {
      updateParent: (update: string) => void;
    }): null {
      props.updateParent('b');
      renderCount++;
      return null;
    };

    const ParentComponent = function (): ReactElement {
      const [state, setState] = useSafeState('a');
      ref.current = state;
      return <ChildComponent updateParent={setState} />;
    };

    const spy = jest.spyOn(console, 'error');

    render(<ParentComponent />);

    // Should cause render twice.
    expect(renderCount).toBe(2);
    // State updated
    expect(ref.current).toBe('b');

    // Won't cause an error.
    expect(spy).not.toBeCalled();
    spy.mockReset();
  });
});
