/**
 * 提供给 createContext 初始化属性时使用，
 * 任何 Context 都不应在 Provider 之外使用
 *
 * @export
 * @param {string} context
 * @param {string} getter
 * @returns {Error}
 * @example
 * const FileListLayoutContext = createContext<FileListLayoutContextModel>({
 *  get type(): never {
 *   throw createOutsideProviderError('FileListLayoutContext', 'type');
 *  }
 * });
 */
export function createOutsideProviderError(
  context: string,
  getter: string
): Error {
  return new Error(
    `Can not access \`${context}.${getter}\` outside ${context}Provider`
  );
}
