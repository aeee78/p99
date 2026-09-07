function getWindowLocation(): Location | undefined {
  return typeof window !== 'undefined' ? window.location : undefined;
}

export function canUseDirectClashApi(): boolean {
  const location = getWindowLocation();

  return (
    typeof location?.hostname === 'string' &&
    location.hostname !== '' &&
    location.protocol !== 'https:'
  );
}

export function getClashWsUrl(): string {
  const hostname = getWindowLocation()?.hostname || '127.0.0.1';

  return `ws://${hostname}:9090`;
}

export function getClashHttpUrl(): string {
  const hostname = getWindowLocation()?.hostname || '127.0.0.1';

  return `http://${hostname}:9090`;
}

export function getClashUIUrl(): string {
  const hostname = getWindowLocation()?.hostname || '127.0.0.1';

  return `http://${hostname}:9090/ui`;
}
