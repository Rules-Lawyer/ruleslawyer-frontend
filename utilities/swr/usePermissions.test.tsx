import { renderHook } from "@testing-library/react";
import useSWR from "swr";
import { useAuth } from "@/utilities/swr/useAuth";
import usePermissions from "@/utilities/swr/usePermissions";

jest.mock("swr");
// Factory mock so the real useAuth (and its @auth0/nextjs-auth0 import, which
// doesn't resolve under jsdom) is never loaded.
jest.mock("@/utilities/swr/useAuth", () => ({ useAuth: jest.fn() }));

const useSWRMock = useSWR as jest.Mock;
const useAuthMock = useAuth as jest.Mock;

function mockAuth(over: { email?: string; token?: string } = {}) {
  useAuthMock.mockReturnValue({
    data: { user: over.email ? { email: over.email } : undefined, token: over.token },
    status: "authenticated",
  });
}

describe("usePermissions", () => {
  beforeEach(() => {
    useSWRMock.mockReset();
    useAuthMock.mockReset();
  });

  it("builds a null SWR key when the user has no email or token", () => {
    mockAuth({});
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: false });

    renderHook(() => usePermissions());

    // First arg to useSWR is the key — should be null so no request fires.
    expect(useSWRMock.mock.calls[0][0]).toBeNull();
  });

  it("builds the permissions key from the user's email and token", () => {
    mockAuth({ email: "user@test.dev", token: "tok" });
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: true });

    renderHook(() => usePermissions());

    expect(useSWRMock.mock.calls[0][0]).toEqual([
      "GET",
      "/permissions/user@test.dev",
      "tok",
    ]);
  });

  it("defaults organizations and conventions to empty arrays when data is absent", () => {
    mockAuth({ email: "user@test.dev", token: "tok" });
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: false });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.permissions.organizations.data).toEqual([]);
    expect(result.current.permissions.conventions.data).toEqual([]);
    expect(result.current.permissions.user.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("passes through the resolved permissions payload", () => {
    mockAuth({ email: "user@test.dev", token: "tok" });
    useSWRMock.mockReturnValue({
      data: {
        user: { id: 1 },
        organizations: [{ id: 10 }],
        conventions: [{ id: 20 }],
      },
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.permissions.user.data).toEqual({ id: 1 });
    expect(result.current.permissions.organizations.data).toEqual([{ id: 10 }]);
    expect(result.current.permissions.conventions.data).toEqual([{ id: 20 }]);
  });

  it("reports loading while Auth0 is still resolving the user", () => {
    useAuthMock.mockReturnValue({
      data: { user: undefined, token: undefined },
      status: "loading",
    });
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: false });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isLoading).toBe(true);
  });

  it("reports loading once authenticated but before the access token arrives", () => {
    useAuthMock.mockReturnValue({
      data: { user: { email: "user@test.dev" }, token: undefined },
      status: "authenticated",
    });
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: false });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isLoading).toBe(true);
  });

  it("is not loading when unauthenticated", () => {
    useAuthMock.mockReturnValue({
      data: { user: undefined, token: undefined },
      status: "unauthenticated",
    });
    useSWRMock.mockReturnValue({ data: undefined, error: undefined, isLoading: false });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces the SWR error on every permission slice", () => {
    mockAuth({ email: "user@test.dev", token: "tok" });
    const error = new Error("boom");
    useSWRMock.mockReturnValue({ data: undefined, error, isLoading: false });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isError.userError).toBe(error);
    expect(result.current.isError.organizationsError).toBe(error);
    expect(result.current.isError.conventionsError).toBe(error);
  });
});
