import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import ConventionModal from "@/components/convention/convention-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { Convention } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");

const fetchMock = frontendFetch as jest.Mock;
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

const openDisclosure = () =>
  ({ isOpen: true, onOpen: jest.fn(), onClose: jest.fn() } as unknown as ReturnType<
    typeof useDisclosure
  >);

// The modal stays in its loading state until the convention-type list resolves,
// so every test needs this fetch to return an array.
function mockConventionTypes() {
  fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 1, name: "Annual" }] });
}

function makeConvention(over: Partial<Convention> = {}): Convention {
  return {
    id: 5,
    organizationId: 7,
    name: "GeekwayCon",
    theme: "Pirates",
    typeId: 1,
    tteConventionId: "tte-1",
    startDate: "2026-07-01T15:00:00.000Z",
    endDate: "2026-07-05T15:00:00.000Z",
    ...over,
  } as Convention;
}

describe("ConventionModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    mockConventionTypes();
  });

  it("titles the modal 'Create' and loads the convention types", async () => {
    render(<ConventionModal organizationId={7} disclosure={openDisclosure()} />);

    expect(await screen.findByText("Create Convention")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      "/org/7/conventionType",
      null,
      "tok"
    );
  });

  it("titles the modal 'Edit' and prefills the name/theme when editing", async () => {
    render(
      <ConventionModal
        conventionIn={makeConvention()}
        conventionId={5}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );

    expect(await screen.findByText("Edit Convention")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("GeekwayCon");
    expect(screen.getByLabelText("Theme")).toHaveValue("Pirates");
  });

  it("POSTs a new convention with the entered details and ISO dates", async () => {
    render(<ConventionModal organizationId={7} disclosure={openDisclosure()} />);

    await userEvent.type(await screen.findByLabelText("Name"), "New Con");
    await userEvent.type(screen.getByLabelText("Theme"), "Space");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const call = fetchMock.mock.calls.find((c) => c[0] === "POST" && c[1] === "/org/7/con");
    expect(call).toBeTruthy();
    const [, , body, token] = call!;
    expect(body).toMatchObject({ name: "New Con", theme: "Space" });
    expect(typeof body.startDate).toBe("string");
    expect(typeof body.endDate).toBe("string");
    expect(token).toBe("tok");
  });

  it("PUTs to the convention endpoint when editing", async () => {
    render(
      <ConventionModal
        conventionIn={makeConvention({ id: 5 })}
        conventionId={5}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    const call = fetchMock.mock.calls.find((c) => c[0] === "PUT" && c[1] === "/con/5");
    expect(call).toBeTruthy();
    expect(call![2]).toMatchObject({
      name: "GeekwayCon",
      theme: "Pirates",
      tteConventionId: "tte-1",
      type: { connect: { id: 1 } },
    });
  });

  it("hides Save from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    render(
      <ConventionModal
        conventionIn={makeConvention()}
        conventionId={5}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );

    await screen.findByText("Edit Convention");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
