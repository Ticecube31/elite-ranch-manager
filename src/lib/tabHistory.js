/**
 * Tab history helpers — persist last visited sub-path per tab root
 * so that switching away and back restores the user's position.
 *
 * Each bottom-nav tab root (e.g. '/calving') stores the last full
 * pathname the user was on within that section in sessionStorage.
 */

const TAB_ROOTS = ['/', '/calving', '/sorting', '/pastures', '/preg-checking', '/herd'];

function storageKey(root) {
  return `tab_last_path:${root}`;
}

/** Call this on every route change to record the latest path per tab. */
export function saveTabPath(pathname) {
  const root = TAB_ROOTS.find(r =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  );
  if (root) {
    sessionStorage.setItem(storageKey(root), pathname);
  }
}

/** Return the last recorded path for a tab root, or the root itself. */
export function getTabPath(root) {
  return sessionStorage.getItem(storageKey(root)) || root;
}