export function assetPath(path: string): string {
  const cleanPath = path.replace(/^\/+/, '');

  if (typeof document === 'undefined') {
    return `/${cleanPath}`;
  }

  const base = document.documentElement.dataset.assetBase?.replace(/\/$/, '') ?? '';
  return `${base}/${cleanPath}`;
}
