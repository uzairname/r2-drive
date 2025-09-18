
export interface Path {
  parts: string[];
  key: string,
  name: string,
  isFolder: boolean;
}

function getName(parts: string[]): string {
  const name = parts[parts.length - 1];
  return name ?? "";
}

/**
 * The key for the object at this path
 */
function getKey(parts: string[], isFolder: boolean): string {
  const base = parts.join("/");
  // The root is an empty string, not "/"
  return (base && isFolder) ? `${base}/` : base;
}

function createPath(parts: string[], isFolder: boolean): Path {
  return {
    parts,
    isFolder,
    key: getKey(parts, isFolder),
    name: getName(parts)
  }
}

export namespace Paths {
  
  export function getRoot(): Path {
    return createPath([], true)
  }

  export function toURLSearchParams(path: Path): URLSearchParams {
    const param = path.parts.join("/");
    const searchParams = new URLSearchParams();
    if (param) {
      searchParams.set("path", param);
    }
    return searchParams;
  }

  /**
   * Returns a new Path instance representing a child directory.
   */
  export function getChildFolder(path: Path, folderName: string): Path {
    if (!path.isFolder) {
      throw new Error("Cannot get child of a non-folder path");
    }
    const parts = [...path.parts, folderName];
    return createPath(parts, true)
  }


  /**
   * Returns a new Path instance representing a child object (file).
   */
  export function getChild(path: Path, fileName: string): Path {
    if (!path.isFolder) {
      throw new Error("Cannot get child of a non-folder path");
    }
    const parts = [...path.parts, fileName]
    return createPath(parts, false)
  }

  /**
   * Returns a new Path instance sliced to the specified end index.
   */
  export function slice(path: Path, end?: number): Path {
    const newParts = path.parts.slice(0, end);
    return createPath(newParts, true)
  }

  export function fromURLSearchParams(searchParams: URLSearchParams): Path {
    const urlPath = searchParams.get("path");
    if (!urlPath) {
      return createPath([], true)
    }
    const pathSegments = urlPath.split("/").filter(Boolean);
    return createPath(pathSegments, true)
  }

  export function fromR2Key(key: string): Path {
    const segments = key.split("/").filter(Boolean);
    return createPath(segments, key.endsWith("/") || segments.length === 0);
  }
}
