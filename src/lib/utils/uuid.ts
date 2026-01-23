/**
 * UUID v4 Generator
 * React Native compatible UUID generator (crypto.randomUUID() not available)
 */

export function generateUUID(): string {
  // eslint-disable-next-line prefer-replace-all
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
