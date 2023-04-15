# react-portal-provider

可在任何 React 项目中使用的 Portal 组件。

## 背景

React 官方为 ReactDOM 提供了 [ReactDOM.createPortal](https://react.dev/reference/react-dom/createPortal) 用作脱离当前组件渲染加载 React 组件的 API。

但这个 API 存在诸多局限性：

1. 这是一个浏览器平台的 API ，只能在 DOM 环境中使用，react-native 环境或是其他非浏览器环境中的 react 无法使用。
2. 需要依赖 DOM node ，不符合“避免直接操作 DOM ”的 react 原则。
3. 可以在任意地方随意加载节点（优点也是缺点），会将一些节点挂载到 React root 节点外，导致 DOM 结构混乱。
4. 无法在回调中直接渲染，`createPortal` 的使用场景大多是在需要显示浮层时使用，如果需要在某个独立 hook 中直接拉起某个浮层元素，使用 `createPortal` 就会比较麻烦。

并且 createPortal 一般是用来管理全局 modal 弹窗和页面固定元素，在使用时很可能会配合 `z-index: x;` `position: fixed;` 这两条样式使用，但由于 `position: fixed;` 在移动端存在很多问题，并且这些问题无法彻底解决，作者个人对这条属性深恶痛绝。如果当项目中的组件充满了 `z-index: x;` `position: fixed;` 的样式组合，项目中的组件层级基本上无法进行管理了，会出现许多意料外的层级覆盖。

`react-portal-provider` 提供了一种新的 React 组件浮层布局管理的思路，并可以在任何 React 环境中使用，不依赖 React DOM 。

基础原理：

这里需要引入一个概念：`组件领域`。
`组件领域`指的是所有组件应该由各自的`领域`：

- 当前组件下的所有操作，不应该在组件外生成、修改或删除组件外的其他节点。（禁用类 DOM 操作）
- 组件内的元素也不应该在当前组件布局区域外渲染。（禁用类 `position: fixed` 布局）
- 同一个层级下的节点，如果多个节点在同一个区域内渲染，后面的节点应该始终覆盖前面的节点。（禁用类 `z-index: x` 布局）

当系统中所有的组件都遵循这个规则，对于组件的层级管理就会变得非常简单，便不会出现 `z-index: 9` `z-index: 99` `z-index: 99999` 这类糟糕的样式声明。

在遵守 `组件领域` 这一规则的前提下，如何实现 `createPortal` 呢？

1. 保证同一个 React 项目中所有组件都渲染在 React root 节点内。
2. 通过 React.Context 让子节点加载到上级节点中，替代 `createPortal` 实现节点传送。
3. 用组件加载顺序结合 `position: absolute` 样式，实现元素的覆盖。

```ts
// 如我们有一个 React 组件 App，这个组件会被作为一个应用加载到 DOM 中，是最上级的元素。
// 里面 Root 是应用的入口组件（根节点）

const App = (
  <PortalProvider>
    <Root>
      // ...这里渲染各类组件
    </Root>
    // <- 在 PortalProvider 任何组件中通过 useCreatePortal()(<XXX />) 渲染的组件会被传送到这里来。🎉
  </PortalProvider>
)
```

## 使用

如果我们需要在 React 应用根节点上渲染一个元素，可参考下面案例。

```ts
import { useContext } from 'react';

// 引入相关方法
import {
  createPortalContext,
  createPortalProvider,
  createModalComponent,
  PortalContextModel,
  PortalProviderProps
} from 'react-portal-provider';

// 创建一个 PortalContext，可以通过不同的 Context 管理不同的组件领域。
const ApplicationPortalContext = createPortalContext();

// 创建一个 ApplicationModal 组件，将这个 Modal 组件和 ApplicationPortalContext 进行关联。
export const ApplicationModal = createModalComponent(ApplicationPortalContext);

// ApplicationModalProvider 下的所有 ApplicationModal 组件会被传送到 ApplicationModalProvider children 中。
export const ApplicationModalProvider = createPortalProvider(
  ApplicationPortalContext
);

// 如果想要在 render 外的渲染 Modal，可以使用 useCreateApplicationModal 生成弹窗
// createApplicationModal = useCreateApplicationModal();
// const onClick = useCallback(() => {
//   createApplicationModal(<Toast text="Lumos!" />);
// }, [createApplicationModal]);
// 调用 onClick 时会在 ApplicationModalProvider
export function useCreateApplicationModal(): PortalContextModel['create'] {
  return useContext(ApplicationPortalContext).create;
}

// 清空与这个 PortalContext 中通过 useCreateApplicationModal 生成的所有元素。
export function useClearApplicationModals(): PortalContextModel['clear'] {
  return useContext(ApplicationPortalContext).clear;
}
```

## 常见问题

- 'Can not access `xxx` outside PortalContextProvider' 报错
  当前操作不在 PortalContextProvider 中，需要在上级元素中 render PortalContextProvider。
- 节点渲染在了其他位置
  注意 PortalProvider render 的位置是否正确，以及生成的 Modal 与 Provider 是否对应同一个 PortalContext 。
- 如何将 Modal 渲染到里当前组件最近的一个 PortalProvider 中？
  如果存在这类场景，可以在多个层级里渲染多个相同的 PortalContextProvider。

```tsx
<PortalProvider>
  <PortalProvider>
    <SomePage />
    {/* SomePage 中与 PortalProvider 关联的 Modal 会被传送到这里来，不会出现到上一层 PortalProvider 的 children 中。 */}
  </PortalProvider>
</PortalProvider>
```

## 限制

一般来说限制主要存在于浏览器环境中，由于浏览器环境中样式布局规则非常散漫，可能会导致各种层级显示错异常。

所以在使用 `react-portal-provider` 时，环境中其他组件不要随意使用 `createPortal` 和 `position: fixed` 破坏组件层级结构。

如果有一些组件不在掌控范围内，部分元素由于 `position: fixed` 导致层级错乱，可以尝试使用 CSS [isolation: isolate;](https://developer.mozilla.org/en-US/docs/Web/CSS/isolation)
