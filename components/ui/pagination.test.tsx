import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "@/components/ui/pagination";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={1}
        total={5}
        noun="games"
        onPageChange={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no pages", () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={0}
        total={0}
        noun="games"
        onPageChange={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current page, total count, and noun", () => {
    render(
      <Pagination
        page={2}
        totalPages={3}
        total={120}
        noun="attendees"
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText("Page 2 of 3 (120 attendees)")).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    render(
      <Pagination
        page={1}
        totalPages={3}
        total={120}
        noun="games"
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("disables Next on the last page", () => {
    render(
      <Pagination
        page={3}
        totalPages={3}
        total={120}
        noun="games"
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("advances to the next page when Next is clicked", async () => {
    const onPageChange = jest.fn();
    render(
      <Pagination
        page={2}
        totalPages={3}
        total={120}
        noun="games"
        onPageChange={onPageChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("goes back to the previous page when Previous is clicked", async () => {
    const onPageChange = jest.fn();
    render(
      <Pagination
        page={2}
        totalPages={3}
        total={120}
        noun="games"
        onPageChange={onPageChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("scrolls the window to the top on a page change", async () => {
    const scrollTo = jest.fn();
    // jsdom doesn't implement scrollTo; stub it and run rAF synchronously.
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    const rafSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });

    render(
      <Pagination
        page={2}
        totalPages={3}
        total={120}
        noun="games"
        onPageChange={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    rafSpy.mockRestore();
  });
});
