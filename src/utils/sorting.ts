/**
 * Natural sort comparator for bead IDs.
 *
 * Handles IDs like:
 * - safevision-7zk.1, safevision-7zk.2, ... safevision-7zk.10
 * - safevision-7zk.1.1, safevision-7zk.1.2, ... safevision-7zk.1.10
 *
 * Sorts by extracting numeric segments after dots and comparing them numerically.
 */
export function naturalSortIds(a: string, b: string): number {
  // Extract numeric suffix parts after the base ID
  // "safevision-7zk.10" -> ["10"]
  // "safevision-7zk.1.2" -> ["1", "2"]
  const extractNumericParts = (id: string): number[] => {
    // Find the first dot followed by digits
    const match = id.match(/\.(\d+(?:\.\d+)*)$/);
    if (!match) return [];
    return match[1].split('.').map(n => parseInt(n, 10));
  };

  const aParts = extractNumericParts(a);
  const bParts = extractNumericParts(b);

  // If neither has numeric parts, fall back to lexicographic
  if (aParts.length === 0 && bParts.length === 0) {
    return a.localeCompare(b);
  }

  // Compare numeric parts position by position
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const aNum = aParts[i] ?? -1; // Missing parts sort before existing
    const bNum = bParts[i] ?? -1;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
  }

  // All numeric parts equal, fall back to lexicographic for tie-breaking
  return a.localeCompare(b);
}
