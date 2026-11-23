export interface VersionedElement {
  id: string;
  version: number;
  versionNonce: number;
}

/** Merge two element lists, keeping the newer copy of each element (ties broken by versionNonce). */
export function mergeElements<T extends VersionedElement>(local: readonly T[], remote: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const el of local) byId.set(el.id, el);
  for (const el of remote) {
    const mine = byId.get(el.id);
    if (!mine || el.version > mine.version || (el.version === mine.version && el.versionNonce < mine.versionNonce)) {
      byId.set(el.id, el);
    }
  }
  return [...byId.values()];
}

/** True when `local` holds an element newer than (or missing from) `remote`. */
export function hasNewerLocal<T extends VersionedElement>(local: readonly T[], remote: readonly T[]): boolean {
  const remoteVersions = new Map(remote.map((el) => [el.id, el.version]));
  return local.some((el) => (remoteVersions.get(el.id) ?? -1) < el.version);
}
