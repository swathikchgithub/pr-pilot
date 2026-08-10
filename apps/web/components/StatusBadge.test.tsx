import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text for each repo status", () => {
    render(<StatusBadge status="READY" />);
    expect(screen.getByText("READY")).toBeInTheDocument();
  });

  it("renders a failed status", () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });
});
