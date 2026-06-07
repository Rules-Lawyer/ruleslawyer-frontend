import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendeeGrid from "@/components/attendee/attendee-grid";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// AttendeeCard has its own suite; stub it so the grid is tested in isolation.
jest.mock("@/components/attendee/attendee-card", () => ({
  __esModule: true,
  default: ({ attendeeId }: { attendeeId: number }) => (
    <div data-testid="attendee-card">{attendeeId}</div>
  ),
}));

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

// The grid issues two GETs: /attendee/pronouns and /con/:id/attendees. Resolve
// pronouns to an empty list and the attendees request to the supplied envelope.
function mockResponse(body: {
  data?: { id: number }[];
  total?: number;
  totalPages?: number;
}) {
  fetchMock.mockImplementation((_method: string, url: string) => {
    if (url.includes("/attendee/pronouns")) {
      return Promise.resolve({ json: async () => [] });
    }
    return Promise.resolve({ json: async () => body });
  });
}

describe("AttendeeGrid", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions();
  });

  it("shows a loading indicator until the attendees request resolves", () => {
    // Pronouns resolve, but a never-resolving attendees fetch keeps the grid loading.
    fetchMock.mockImplementation((_method: string, url: string) => {
      if (url.includes("/attendee/pronouns")) {
        return Promise.resolve({ json: async () => [] });
      }
      return new Promise(() => {});
    });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);
    expect(screen.getByLabelText("Loading...")).toBeInTheDocument();
  });

  it("renders an AttendeeCard for each returned attendee", async () => {
    mockResponse({ data: [{ id: 1 }, { id: 2 }, { id: 3 }], total: 3, totalPages: 1 });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);
    expect(await screen.findAllByTestId("attendee-card")).toHaveLength(3);
  });

  it("requests page one of the convention's attendees", async () => {
    mockResponse({ data: [], total: 0, totalPages: 1 });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);
    await screen.findByPlaceholderText("Type a name");
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/con/5/attendees?limit=50&page=1&filter="),
      null,
      "tok"
    );
  });

  it("re-fetches with the debounced filter when searching", async () => {
    mockResponse({ data: [], total: 0, totalPages: 1 });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);

    await userEvent.type(await screen.findByPlaceholderText("Type a name"), "ada");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "GET",
        expect.stringContaining("filter=ada"),
        null,
        "tok"
      )
    );
  });

  it("renders pagination with the current page and Previous disabled on page one", async () => {
    mockResponse({ data: [{ id: 1 }], total: 120, totalPages: 3 });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);

    // Pagination is rendered both above and below the grid.
    expect(await screen.findAllByText(/Page 1 of 3\s*\(120 attendees\)/)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Previous" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Next" })[0]).toBeEnabled();
  });

  it("navigates between pages with Next and Previous, re-fetching each time", async () => {
    mockResponse({ data: [{ id: 1 }], total: 120, totalPages: 3 });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);

    await userEvent.click((await screen.findAllByRole("button", { name: "Next" }))[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "GET",
        expect.stringContaining("page=2"),
        null,
        "tok"
      )
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Previous" })[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "GET",
        expect.stringContaining("page=1"),
        null,
        "tok"
      )
    );
  });

  it("omits pagination when there is only one page", async () => {
    mockResponse({ data: [{ id: 1 }], total: 1, totalPages: 1 });
    render(<AttendeeGrid conventionId={5} organizationId={7} />);
    await screen.findByTestId("attendee-card");
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });

  it("uses a caller-supplied list without hitting the attendees endpoint", async () => {
    mockResponse({ data: [], total: 0, totalPages: 1 });
    render(
      <AttendeeGrid
        attendeesIn={[{ id: 9 }, { id: 10 }] as never}
        conventionId={5}
        organizationId={7}
      />
    );
    expect(await screen.findAllByTestId("attendee-card")).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/con/5/attendees"),
      null,
      "tok"
    );
  });
});
