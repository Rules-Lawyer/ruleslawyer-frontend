import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { CollectionWithCount } from "@/types/models";
import useSWR from "swr";

type OrgCollectionsKey = ["GET", string, string];

const orgCollectionsKey = (
  organizationId: number,
  token: string
): OrgCollectionsKey => [
  "GET",
  "/org/" + organizationId + "/collections",
  token,
];

const orgCollectionsFetcher = ([method, url, token]: OrgCollectionsKey) =>
  frontendFetch(method, url, null, token).then((res) => res.json());

// Org collection list, SWR-backed. When a parent already loaded the list it can
// pass it as fallbackData; in that case the hook does NOT refetch on mount (the
// data is already fresh) but mutate() still revalidates on demand after a
// create/import/delete. With no fallback it fetches the list itself.
export function useOrgCollections(
  organizationId?: number,
  fallbackData?: CollectionWithCount[]
) {
  const session = useAuth();
  const token = session?.data?.token;
  const seeded = fallbackData !== undefined;

  const { data, isLoading, mutate } = useSWR<CollectionWithCount[]>(
    token && organizationId ? orgCollectionsKey(organizationId, token) : null,
    orgCollectionsFetcher,
    {
      fallbackData,
      revalidateOnMount: !seeded,
      revalidateIfStale: !seeded,
      revalidateOnFocus: false,
    }
  );

  return {
    collections: data ?? fallbackData ?? null,
    isLoading: seeded ? false : token && organizationId ? isLoading : true,
    mutate,
  };
}
