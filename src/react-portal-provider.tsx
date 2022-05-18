import React, {
  createContext,
  ReactElement,
  Context,
  cloneElement,
  ReactNode,
  ComponentType,
  useMemo,
  useCallback,
  useRef
} from 'react';

import { createOutsideProviderError } from './create-outside-provider-error';
import { useSafeState } from './use-safe-state';

export interface Portal {
  update: (nextElement: ReactElement) => void;
  unmount: () => void;
}

export interface PortalContextModel {
  create: (element: ReactElement) => Portal;
  clear: () => void;
}

export function createPortalContext(): Context<PortalContextModel> {
  return createContext<PortalContextModel>({
    get create(): never {
      throw createOutsideProviderError('PortalContext', 'create');
    },
    get clear(): never {
      throw createOutsideProviderError('PortalContext', 'clear');
    }
  });
}

export interface PortalProviderProps {
  children: ReactNode;
}

// Clone element and add a unique key prop in current state.
function cloneWithKey(element: ReactElement, id: number): ReactElement {
  return cloneElement(element, {
    key: `portal-element-${id}`
  });
}

export function createPortalProvider(
  PortalContext: Context<PortalContextModel>
): ComponentType<PortalProviderProps> {
  return function PortalProvider(props: PortalProviderProps): ReactElement {
    const { children } = props;

    const [elements, setElements] = useSafeState<ReactElement[]>([]);

    // 需要使用 ref 维护 elements 数组中的元素 key
    // 传入的 element 都没有 key props，在数组中极可能出现串元素的情况，
    // 每次 create 生成和 update 的元素需要在当前 provider 中具有唯一的 key
    const idRef = useRef(0);

    const create = useCallback((element: ReactElement) => {
      const id = idRef.current++;

      // Keep track current element state.
      let current: ReactElement | null = null;

      setElements((state) => {
        const array = state.slice();

        const cloned = cloneWithKey(element, id);

        current = cloned;

        array.push(cloned);

        return array;
      });

      return {
        update(nextElement: ReactElement): void {
          setElements((state) => {
            const array = state.slice();
            const cloned = cloneWithKey(nextElement, id);

            // Find current element in array.
            const index = current ? array.indexOf(current) : -1;

            if (index > -1) {
              // Replace with new element in array.
              array.splice(index, 1, cloned);

              // Update current element.
              current = cloned;

              return array;
            } else {
              current = null;
              // Couldn't update an unmounted element.
              return state;
            }
          });
        },
        unmount(): void {
          setElements((state) => {
            const array = state.slice();

            // Find current element in array.
            const index = current ? array.indexOf(current) : -1;

            if (index > -1) {
              // Remove from array.
              array.splice(index, 1);

              // Free current element state.
              current = null;
              return array;
            } else {
              current = null;
              // This element had been unmounted.
              return state;
            }
          });
        }
      };
    }, []);

    const clear = useCallback(() => {
      // Clear all elements from state.
      setElements([]);
    }, []);

    const value = useMemo(() => {
      return {
        create,
        clear
      };
    }, [create, clear]);

    return (
      <PortalContext.Provider value={value}>
        {children}
        {/* Only render last element in state. */ elements[elements.length - 1]}
      </PortalContext.Provider>
    );
  };
}
