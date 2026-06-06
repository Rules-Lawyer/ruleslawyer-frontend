import { render, screen } from "@testing-library/react";
import ConventionTypeCard from "@/components/convention-type/convention-type-card";
import usePermissions from "@/utilities/swr/usePermissions";
import type { ConventionType } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// The card owns the card chrome; the modal it embeds is exercised separately.
jest.mock("@/components/convention-type/convention-type-modal", () => ({
  __esModule: true,
  default: () => null,
}));

const usePermissionsMock = usePermissions as jest.Mock;

function mockPermissions(opts: { superAdmin?: boolean } = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: [] },
      conventions: { data: [] },
    },
    isLoading: false,
    isError: {},
  });
}

function makeConventionType(over: Partial<ConventionType> = {}): ConventionType {
  return {
    id: 3,
    name: "Annual Con",
    description: null,
    logo: null,
    logoSquare: null,
    icon: null,
    content: null,
    organizationId: 7,
    ...over,
  } as ConventionType;
}

describe("ConventionTypeCard", () => {
  beforeEach(() => {
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("renders the convention type name", async () => {
    render(<ConventionTypeCard conventionTypeIn={makeConventionType()} />);
    expect(await screen.findByText("Annual Con")).toBeInTheDocument();
  });

  it("falls back to a placeholder for an empty name", async () => {
    render(<ConventionTypeCard conventionTypeIn={makeConventionType({ name: "" })} />);
    expect(await screen.findByText("[unknown convention type]")).toBeInTheDocument();
  });
});
