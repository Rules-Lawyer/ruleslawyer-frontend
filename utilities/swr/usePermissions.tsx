import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { PermissionsResponse } from "@/types/models";
import useSWR from "swr";

export default function usePermissions() {
  const session = useAuth();

  const combined = useSWR<PermissionsResponse>(
    session?.data?.user?.email && session?.data?.token
      ? [
          "GET",
          "/permissions/" + session?.data?.user?.email,
          session?.data?.token,
        ]
      : null,
    ([method, url, token]: [string, string, string]) =>
      frontendFetch(method, url, null, token).then((res) => res.json())
  );

  const permissions = {
    user: { data: combined.data?.user },
    organizations: { data: combined.data?.organizations ?? [] },
    conventions: { data: combined.data?.conventions ?? [] },
  };

  // combined.isLoading only covers the permissions request itself. While auth is
  // still resolving (Auth0 loading the user, then the access-token fetch), the SWR
  // key above is null, so combined.isLoading is false and consumers would render
  // empty data with no loading indicator. Treat that window as loading too.
  const isLoading =
    session.status === "loading" ||
    (session.status === "authenticated" && !session?.data?.token) ||
    combined.isLoading;

  return {
    permissions: permissions,
    isLoading: isLoading,
    isError: {
      userError: combined.error,
      organizationsError: combined.error,
      conventionsError: combined.error,
    },
  };
}
