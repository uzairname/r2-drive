import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Path, Paths } from "./path-system/path";

export class URLStateManager {
  constructor(private router: AppRouterInstance) {}

  /**
   * Update the URL to reflect the current path
   * @param path - The current path array
   */
  updateUrl(path: Path): void {
    const params = Paths.toURLSearchParams(path)
    const url = params ? `/explorer?${params}` : "/explorer";
    this.router.replace(url);
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