import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export class URLStateManager {
  constructor(private router: AppRouterInstance) {}

  /**
   * Update the URL to reflect the current path
   * @param path - The current path array
   */
  updateUrl(path: string[]): void {
    const pathParam = path.slice(1).join("/"); // Remove bucket name from URL path
    const params = new URLSearchParams();
    if (pathParam) {
      params.set("path", pathParam);
    }
    const paramString = params.toString();
    const url = paramString ? `/explorer?${paramString}` : "/explorer";
    this.router.replace(url);
  }

  /**
   * Parse the URL path parameter into path segments
   * @param urlPath - The path parameter from the URL
   * @param bucketName - The bucket name to prepend
   * @returns Array of path segments including bucket name
   */
  parseUrlPath(urlPath: string | null, bucketName: string): string[] {
    if (!urlPath) {
      return [bucketName];
    }
    const pathSegments = urlPath.split("/").filter(Boolean);
    return [bucketName, ...pathSegments];
  }

  /**
   * Get the current path parameter from URL search params
   * @param searchParams - URLSearchParams from useSearchParams
   * @returns The path parameter or null
   */
  getCurrentPath(searchParams: URLSearchParams): string | null {
    return searchParams.get("path");
  }
}