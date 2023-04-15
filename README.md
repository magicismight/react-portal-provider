# react-portal-provider

A Portal component that can be used in any React project.

## Background

React officially provides [ReactDOM.createPortal](https://react.dev/reference/react-dom/createPortal) as an API for rendering React components outside of the current component's rendering context.

However, this API has several limitations:

- It's a browser platform API and can only be used in the DOM environment. React in non-browser environments, such as react-native, cannot use it.
- It requires a dependency on DOM nodes which contradicts the "avoid direct manipulation of the DOM" principle in React.
- It allows nodes to be loaded anywhere (which can be both an advantage and a disadvantage), resulting in some nodes being mounted outside of the React root node, causing confusion in the DOM structure.
- It cannot be directly rendered in a callback. `createPortal` is mostly used when displaying overlays. If you need to display an overlay element directly in a specific independent hook, using `createPortal` may be difficult.

`createPortal` is generally used to manage global modal pop-ups and fixed elements on a page. When used, it often requires the use of z-index: x; position: fixed; styles. However, because position: fixed; has many problems in mobile environments, and these problems cannot be completely resolved, the author personally despises this property. If components in a project are filled with combinations of z-index: x; position: fixed; styles, the component hierarchy in the project will be difficult to manage, resulting in unexpected layer overlaps.

`react-portal-provider` provides a new way of managing React component overlays and can be used in any React environment without relying on React DOM.

Basic principle:

Here, we need to introduce a concept: `component domain`. The `component domain` refers to the fact that all components should have their own domain:

- All operations under the current component should not generate, modify, or delete other nodes outside of the component. (Disable DOM-like operations)
- Elements within the component should not be rendered outside of the current component's layout area. (Disable position: fixed-like layout)
- If multiple nodes in the same layer are rendered in the same area, the later nodes should always overlap the earlier nodes. (Disable z-index: x-like layout)

When all components in the system follow this rule, component hierarchy management becomes very simple, and there will be no poor style declarations such as `z-index: 9` `z-index: 999` `z-index: 99999 !important`.

Given that we follow the `component domain`, how can we implement `createPortal`?

1. Ensure that all components in the same React project are rendered within the React root node.
2. Use React.Context to load child nodes into parent nodes, replacing createPortal to achieve node transport.
3. Use the component loading order combined with position: absolute style to achieve element overlap.

```tsx
// If we have a React component App that will be loaded as an application into the DOM, it is the top-level element.
// Inside, Root is the entry component of the application (root node).

const App = (
  <PortalProvider>
    <Root>
      // ...render components here
    </Root>
    // <- Components rendered in any component using useCreatePortal()(<XXX />) in PortalProvider will be transported here. 🎉
  </PortalProvider>
)
```

## Usage

If we need to render an element on the root node of a React application, we can refer to the following example.

```ts
import { useContext } from 'react';

// Import related methods
import {
  createPortalContext,
  createPortalProvider,
  createModalComponent,
  PortalContextModel,
  PortalProviderProps
} from 'react-portal-provider';

// Create a PortalContext, which can manage different component domains through different contexts.
const ApplicationPortalContext = createPortalContext();
const ApplicationPortalContext = createPortalContext();

// Create an ApplicationModal component, associating the Modal component with ApplicationPortalContext.
export const ApplicationModal = createModalComponent(ApplicationPortalContext);

// All ApplicationModal components under ApplicationModalProvider will be transported to the children of ApplicationModalProvider.
export const ApplicationModalProvider = createPortalProvider(
  ApplicationPortalContext
);

// If you want to render a modal outside of the render function, you can use useCreateApplicationModal to generate popups.
// createApplicationModal = useCreateApplicationModal();
// const onClick = useCallback(() => {
//   createApplicationModal(<Toast text="Lumos!" />);
// }, [createApplicationModal]);
// When onClick is called, it will be transported to ApplicationModalProvider.
export function useCreateApplicationModal(): PortalContextModel['create'] {
  return useContext(ApplicationPortalContext).create;
}

// Clear all elements generated using useCreateApplicationModal in this PortalContext.
export function useClearApplicationModals(): PortalContextModel['clear'] {
  return useContext(ApplicationPortalContext).clear;
}
```

## FAQs

- 'Can not access xxx outside PortalContextProvider' error
  The current operation is not in PortalContextProvider and needs to render PortalContextProvider in the parent element.
- Node rendering is in the wrong location
  Pay attention to whether the position where PortalProvider is rendered is correct, and whether the generated Modal corresponds to the same PortalContext as the Provider.
- How to render Modal to the nearest PortalProvider of the current component?
  If such a scenario exists, you can render multiple identical PortalContextProviders at multiple levels.

```tsx
<PortalProvider>
  <PortalProvider>
    <SomePage />
    {/* The Modal associated with PortalProvider in SomePage will be transported here, not in the children of the upper-level PortalProvider. */}
  </PortalProvider>
</PortalProvider>
```

## Limitations

Generally, limitations mainly exist in the browser environment. Because the style layout rules in the browser environment are very scattered, it may cause various hierarchical display anomalies.

Therefore, when using `react-portal-provider`, other components in the environment should not use `createPortal` and `position: fixed` to destroy the component hierarchy.

If there are some components that are not within the scope of control, and some elements cause hierarchical confusion due to position: fixed, you can try to use CSS [isolation: isolate;](https://developer.mozilla.org/en-US/docs/Web/CSS/isolation)
