// The candidate-app copy of the chip contract. See admin/test/chip.test.jsx for
// the full account of the bug this pins — filter pills shrinking instead of
// overflowing, clipping their own labels mid-word on a narrow phone.
//
// It is duplicated here rather than shared because the COMPONENT is duplicated:
// both apps carry their own Panels.jsx, the bug was present in both, and a test
// that only ever imported the admin copy would have gone on passing while the
// candidate-facing one stayed broken. admin/test/uiParity.test.js is what keeps
// the two implementations honest with each other.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip, ChipRow } from "../src/components/ui/Panels.jsx";

describe("Chip", () => {
  it("refuses to shrink, so an overflowing row scrolls instead of clipping labels", () => {
    render(<Chip>All applications</Chip>);

    expect(screen.getByRole("button", { name: "All applications" }).className).toContain("shrink-0");
  });

  it("keeps the label on one line — the other half of the contract", () => {
    render(<Chip>Interview scheduled</Chip>);

    expect(screen.getByRole("button").className).toContain("whitespace-nowrap");
  });

  it("announces which filter is active to a screen reader, not just with colour", () => {
    const { rerender } = render(<Chip active>Assessments</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");

    rerender(<Chip>Assessments</Chip>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });
});

describe("ChipRow", () => {
  it("is a labelled group that scrolls rather than wrapping", () => {
    render(
      <ChipRow label="Filter applications">
        <Chip>All applications</Chip>
        <Chip>Interview scheduled</Chip>
      </ChipRow>
    );
    const row = screen.getByRole("group", { name: "Filter applications" });

    expect(row).toBeInTheDocument();
    expect(row.className).toContain("overflow-x-auto");
    expect(row.className).not.toContain("flex-wrap");
  });
});
