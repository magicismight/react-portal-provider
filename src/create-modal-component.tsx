import {
  ReactNode,
  useRef,
  useLayoutEffect,
  useContext,
  Context,
  ComponentType,
  ReactElement
} from 'react';

import type { Portal } from './react-portal-provider';

export interface ModalProps {
  children: ReactNode;
}

export function createModalComponent<
  ModalContext extends {
    create: (element: ReactElement) => Portal;
  }
>(Context: Context<ModalContext>): ComponentType<ModalProps> {
  return function Modal(props: ModalProps): null {
    const { children } = props;
    const createModal = useContext(Context).create;
    const modalRef = useRef<Portal>();

    useLayoutEffect(() => {
      if (!modalRef.current) {
        modalRef.current = createModal(<>{children}</>);
      } else {
        modalRef.current.update(<>{children}</>);
      }
    });

    useLayoutEffect(() => {
      return (): void => modalRef.current?.unmount();
    }, []);

    return null;
  };
}
