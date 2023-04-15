import {
  useState,
  useRef,
  useEffect,
  Dispatch,
  SetStateAction,
  useCallback
} from 'react';

/**
 * Prevent React setState warning.
 * Warning: Cannot update a component (`XXX`) while rendering a different component (`YYY`). To locate the bad setState() call inside `YYY`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
 *
 * @param initialState
 * @returns
 */
export function useSafeState<S>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState(initialState);

  // To determine whether React is currently rendering, you cannot directly call setState during rendering.
  const renderingRef = useRef(true);
  renderingRef.current = true;

  // If you have to perform updates with setState that need to be temporarily stored during React rendering, you can execute them after rendering has finished, in the order they were queued.
  const updatesRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // You can consider the execution of the useEffect callback as the completion of rendering.
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

  const setSafeState: Dispatch<SetStateAction<S>> = useCallback(
    (elements: SetStateAction<S>): void => {
      if (renderingRef.current) {
        updatesRef.current.push(() => {
          setState(elements);
        });
      } else {
        setState(elements);
      }
    },
    []
  );

  return [state, setSafeState];
}
