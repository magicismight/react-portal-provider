import { useState, useRef, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

/**
 * Prevent React setState warning.
 * Warning: Cannot update a component (`XXX`) while rendering a different component (`YYY`). To locate the bad setState() call inside `YYY`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
 *
 * @param initialState
 * @returns
 */
export function useSafeState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState(initialState);

  // 判断 React 是否正在渲染，在渲染期间不能直接调用 setState
  const renderingRef = useRef(true);
  renderingRef.current = true;

  // 暂存在 React 渲染期间需要调用 setState 的更新操作，在 render 结束后再依次执行 setState
  const updatesRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // useEffect 回调调用时可认为完成 rendering
    renderingRef.current = false;

    const updates = updatesRef.current;

    if (!updates.length) {
      return;
    }

    let update = updates.shift();
    while (update) {
      update();
      update = updates.shift();
    }
  });

  const setSafeState: Dispatch<SetStateAction<S>> = useCallback((elements: SetStateAction<S>): void => {
    if (renderingRef.current) {
      updatesRef.current.push(() => {
        setState(elements);
      });
    } else {
      setState(elements);
    }
  }, []);

  return [state, setSafeState];
}
