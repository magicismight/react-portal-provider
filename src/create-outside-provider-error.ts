/**
 * Context should only be used within a Provider.
 * If you attempt to use the default value of a Context, you should get an error.
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
