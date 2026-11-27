/** Web uses localStorage; on the server (web output is "server") there is no storage, so nothing persists. */
const hasWindow = typeof window !== 'undefined';

export const authStorage = {
  getItem: (key: string) => (hasWindow ? window.localStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (hasWindow) window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (hasWindow) window.localStorage.removeItem(key);
  },
};
