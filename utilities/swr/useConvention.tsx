import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { ConventionWithCollections } from "@/types/models";
import useSWR, { preload } from "swr";

type ConventionKey = ["GET", string, string];

// Shared key + fetcher so preloadConvention (hover/focus) and useConvention
// (on expand) hit the same SWR cache entry — the preloaded response is reused
// instead of refetched, so the panel renders full content on first paint.
const conventionKey = (id: number, token: string): ConventionKey => [
  "GET",
  "/con/" + id,
  token,
];

const conventionFetcher = ([method, url, token]: ConventionKey) =>
  frontendFetch(method, url, null, token).then((res) => res.json());

export function preloadConvention(id: number, token?: string) {
  if (!token) return;
  preload(conventionKey(id, token), conventionFetcher);
}

// Unlike useCollection/useOrgCollections, this always revalidates even when
// seeded: the parent list only has the convention header (name/theme/dates), so
// fallbackData paints that instantly while the fetch fills in the collections.
export function useConvention(
  id: number,
  fallbackData?: ConventionWithCollections
) {
  const session = useAuth();
  const token = session?.data?.token;

  const { data, isLoading, mutate } = useSWR<ConventionWithCollections>(
    token ? conventionKey(id, token) : null,
    conventionFetcher,
    { fallbackData }
  );

  return {
    convention: data ?? fallbackData ?? null,
    // With fallbackData we have something to show immediately, so we're not
    // "loading" even while the background revalidation runs. Otherwise: while auth
    // is still resolving the key is null, so SWR reports not-loading with no data —
    // treat that window as loading too.
    isLoading: fallbackData ? false : token ? isLoading : true,
    mutate,
  };
}
