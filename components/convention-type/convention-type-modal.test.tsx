import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import ConventionTypeModal from "@/components/convention-type/convention-type-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import { toastSaveError, toastNetworkError } from "@/utilities/toastFetchError";
import type { ConventionType } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// The real toasts render through HeroUI's global toaster; stub them so the
// failure-path assertions don't depend on that machinery being mounted.
jest.mock("@/utilities/toastFetchError", () => ({
  toastSaveError: jest.fn(),
  toastNetworkError: jest.fn(),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const toastSaveErrorMock = toastSaveError as jest.Mock;
const toastNetworkErrorMock = toastNetworkError as jest.Mock;

function mockPermissions(opts: {
  superAdmin?: boolean;
  orgAdmin?: { organizationId: number; admin: boolean }[];
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.orgAdmin ?? [] },
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

const closedDisclosure = () =>
  ({ isOpen: false, onOpen: jest.fn(), onClose: jest.fn() } as unknown as ReturnType<
    typeof useDisclosure
  >);

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

describe("ConventionTypeModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    toastSaveErrorMock.mockReset();
    toastNetworkErrorMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("renders nothing while the disclosure is closed", () => {
    const { container } = render(
      <ConventionTypeModal organizationId={7} disclosure={closedDisclosure()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("titles the modal 'New Convention Type' when creating", async () => {
    render(<ConventionTypeModal organizationId={7} disclosure={openDisclosure()} />);
    expect(
      await screen.findByText("Convention Type Editor - New Convention Type")
    ).toBeInTheDocument();
  });

  it("titles the modal with the existing name when editing", async () => {
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType()}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );
    expect(
      await screen.findByText("Convention Type Editor - Annual Con")
    ).toBeInTheDocument();
  });

  it("POSTs a new convention type with the entered name", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const disclosure = openDisclosure();
    const onSaved = jest.fn();
    render(
      <ConventionTypeModal
        organizationId={7}
        disclosure={disclosure}
        onSaved={onSaved}
      />
    );

    await userEvent.type(await screen.findByLabelText("Name"), "Spring Con");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "Post",
      "/org/7/conventionType",
      { name: "Spring Con" },
      "tok"
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ name: "Spring Con" }));
    expect(disclosure.onClose).toHaveBeenCalledTimes(1);
  });

  it("PUTs to the convention-type endpoint when editing", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const disclosure = openDisclosure();
    const onSaved = jest.fn();
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType({ id: 9, name: "Annual Con" })}
        organizationId={7}
        disclosure={disclosure}
        onSaved={onSaved}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/conventionType/9",
      { name: "Annual Con" },
      "tok"
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ name: "Annual Con" }));
    expect(disclosure.onClose).toHaveBeenCalledTimes(1);
  });

  it("prefills the name field with the existing convention type when editing", async () => {
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType({ id: 9, name: "Annual Con" })}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );

    expect(await screen.findByLabelText("Name")).toHaveValue("Annual Con");
  });

  it("PUTs the edited name when the field is changed", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const disclosure = openDisclosure();
    const onSaved = jest.fn();
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType({ id: 9, name: "Annual Con" })}
        organizationId={7}
        disclosure={disclosure}
        onSaved={onSaved}
      />
    );

    const nameField = await screen.findByLabelText("Name");
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Winter Con");
    expect(nameField).toHaveValue("Winter Con");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/conventionType/9",
      { name: "Winter Con" },
      "tok"
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ name: "Winter Con" }));
  });

  it("surfaces a save error and keeps the modal open when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const disclosure = openDisclosure();
    const onSaved = jest.fn();
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType({ id: 9 })}
        organizationId={7}
        disclosure={disclosure}
        onSaved={onSaved}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(toastSaveErrorMock).toHaveBeenCalledTimes(1));
    expect(onSaved).not.toHaveBeenCalled();
    expect(disclosure.onClose).not.toHaveBeenCalled();
  });

  it("surfaces a network error when the request rejects", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType({ id: 9 })}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(toastNetworkErrorMock).toHaveBeenCalledTimes(1));
  });

  it("hides Save from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType()}
        organizationId={7}
        disclosure={openDisclosure()}
      />
    );

    await screen.findByText("Convention Type Editor - Annual Con");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("closes without saving when Close is pressed", async () => {
    const disclosure = openDisclosure();
    render(
      <ConventionTypeModal
        conventionTypeIn={makeConventionType()}
        organizationId={7}
        disclosure={disclosure}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Close" }));

    expect(disclosure.onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
