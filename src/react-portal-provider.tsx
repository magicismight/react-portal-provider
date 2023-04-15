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

export function createPortalProvider(
  PortalContext: Context<PortalContextModel>
): ComponentType<PortalProviderProps> {
  return function PortalProvider(props: PortalProviderProps): ReactElement {
    const { children } = props;
    const [elements, setElements] = useSafeState<ReactElement[]>([]);

    // To ensure that each element in the array has a unique key, it is necessary to use a ref to maintain the key of the elements.
    // The elements passed into the array do not have key props, which may result in the appearance of consecutive elements in the array.
    // Therefore, every element that is created or updated needs to have a unique key within the current provider.
    const idRef = useRef(0);

    const create = useCallback((element: ReactElement) => {
      const id = idRef.current++;
      let current: ReactElement | null = null;

      setElements((state) => {
        const array = state.slice();
        const cloned = cloneElement(element, {
          key: id
        });

        current = cloned;
        array.push(cloned);

        return array;
      });

      return {
        update(nextElement: ReactElement): void {
          setElements((state) => {
            const array = state.slice();
            const cloned = cloneElement(nextElement, {
              key: id
            });
            const index = current ? array.indexOf(current) : -1;

            if (index > -1) {
              array.splice(index, 1, cloned);
              current = cloned;
              return array;
            } else {
              // unmounted
              return state;
            }
          });
        },
        unmount(): void {
          setElements((state) => {
            const array = state.slice();
            const index = current ? array.indexOf(current) : -1;

            if (index > -1) {
              array.splice(index, 1);
              current = null;
              return array;
            } else {
              return state;
            }
          });
        }
      };
    }, []);

    const clear = useCallback(() => {
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
        {elements[elements.length - 1]}
      </PortalContext.Provider>
    );
  };
}
