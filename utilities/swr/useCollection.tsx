import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { CollectionWithCount } from "@/types/models";
import useSWR from "swr";

type CollectionKey = ["GET", string, string];

const collectionKey = (id: number, token: string): CollectionKey => [
  "GET",
  "/collection/" + id,
  token,
];

const collectionFetcher = ([method, url, token]: CollectionKey) =>
  frontendFetch(method, url, null, token).then((res) => res.json());

// Single collection, SWR-backed. When a parent seeds it via fallbackData (the card
// case), the hook does NOT fetch on mount — first paint uses the prop and mutate()
// still refreshes on demand after an edit. With no fallback it fetches the
// collection itself by id.
export function useCollection(
  id: number,
  fallbackData?: CollectionWithCount
) {
  const session = useAuth();
  const token = session?.data?.token;
  const seeded = fallbackData !== undefined;

  const { data, isLoading, mutate } = useSWR<CollectionWithCount>(
    token ? collectionKey(id, token) : null,
    collectionFetcher,
    {
      fallbackData,
      revalidateOnMount: !seeded,
      revalidateIfStale: !seeded,
      revalidateOnFocus: false,
    }
  );

  return {
    collection: data ?? fallbackData ?? null,
    isLoading: seeded ? false : token ? isLoading : true,
    mutate,
  };
}
