import { z } from 'zod'

export const PathSchema = z.object({
  parts: z.array(z.string()
    .refine((p) => p.length > 0, { message: 'Path segments cannot be empty' })
    .refine((p) => !/[/]/g.test(p), { message: 'Path segments contain invalid characters' })
  ),
  key: z.string(),
  name: z.string(),
  isFolder: z.boolean(),
})

export type Path = z.infer<typeof PathSchema>

function getName(parts: string[]): string {
  const name = parts[parts.length - 1]
  return name ?? ''
}

/**
 * The key for the object at this path
 */
function getKey(parts: string[], isFolder: boolean): string {
  const base = parts.join('/')
  // The root is an empty string, not "/"
  return base && isFolder ? `${base}/` : base
}

function createPath(parts: string[], isFolder: boolean): Path {
  return PathSchema.parse({
    parts,
    isFolder,
    key: getKey(parts, isFolder),
    name: getName(parts),
  })
}

export namespace PathUtils {
  export function getRoot(): Path {
    return createPath([], true)
  }

  export function toURLSearchParams(path: Path): URLSearchParams {
    const param = path.parts.join('/')
    const searchParams = new URLSearchParams()
    if (param) {
      searchParams.set('path', param)
    }
    return searchParams
  }

  /**
   * Returns a new Path instance representing a child directory.
   */
  export function getChildFolder(path: Path, folderName: string): Path {
    if (!path.isFolder) {
      throw new Error('Cannot get child of a non-folder path')
    }
    const parts = [...path.parts, folderName]
    return createPath(parts, true)
  }

  /**
   * Returns a new Path instance representing a child object (file).
   */
  export function filePath(path: Path, file: File): Path {
    if (!path.isFolder) {
      throw new Error('Cannot create file path from a non-folder path')
    }
    const parts = [...path.parts, file.webkitRelativePath || file.name]
    return createPath(parts, false)
  }

  /**
   * Returns a new Path instance sliced to the specified end index.
   */
  export function slice(path: Path, end?: number): Path {
    const newParts = path.parts.slice(0, end)
    return createPath(newParts, true)
  }

  export function fromURLSearchParams(searchParams: URLSearchParams): Path {
    const urlPath = searchParams.get('path')
    if (!urlPath) {
      return createPath([], true)
    }
    const pathSegments = urlPath.split('/').filter(Boolean)
    return createPath(pathSegments, true)
  }

  export function fromR2Key(key: string): Path {
    const segments = key.split('/').filter(Boolean)
    return createPath(segments, key.endsWith('/') || segments.length === 0)
  }

  export function rename(path: Path, newName: string): Path {
    if (path.parts.length === 0) {
      throw new Error('Cannot rename the root path')
    }
    const newParts = [...path.parts.slice(0, -1), newName]
    return createPath(newParts, path.isFolder)
  }

  /**
   * Normalize a path key by removing trailing slashes.
   * Useful for comparing paths regardless of whether they represent files or folders.
   */
  export function normalizeKey(key: string): string {
    return key.replace(/\/+$/, '')
  }

  /**
   * Check if a path key represents a folder (ends with / or is empty for root).
   */
  export function isFolder(key: string): boolean {
    return key === '' || key.endsWith('/')
  }

  /**
   * Check if `childKey` is contained within `parentKey`.
   * e.g., "folder1/file.txt" is a child of "folder1/"
   */
  export function isChildOf(childKey: string, parentKey: string): boolean {
    if (parentKey === '') return true // Root contains everything
    return childKey.startsWith(parentKey)
  }

  /**
   * Check if `parentKey` is a parent directory of `childKey`.
   * e.g., "folder1/" is a parent of "folder1/folder2/file.txt"
   * Only folders (keys ending with /) can be parents.
   */
  export function isParentOf(parentKey: string, childKey: string): boolean {
    if (!parentKey.endsWith('/')) return false
    return childKey.startsWith(parentKey)
  }

  /**
   * Check if two path keys refer to the same location (ignoring trailing slashes).
   */
  export function keysEqual(keyA: string, keyB: string): boolean {
    return normalizeKey(keyA) === normalizeKey(keyB)
  }

  /**
   * Validate a path key string.
   * Returns null if valid, or an error message if invalid.
   *
   * Rules:
   * - Empty string is valid (root)
   * - No leading slash
   * - No double slashes
   * - Segments cannot be empty (handled by no double slashes)
   */
  export function validateKey(key: string): string | null {
    if (key === '') return null // Root is valid

    if (key.startsWith('/')) {
      return 'Path must not start with /'
    }

    if (key.includes('//')) {
      return 'Path must not contain double slashes'
    }

    return null
  }
}
