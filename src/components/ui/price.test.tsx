import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Price } from "./price";

describe("Price", () => {
  it("renders rupees with Indian grouping", () => {
    render(<Price paise={118000} />);
    expect(screen.getByText("₹1,180")).toBeInTheDocument();
  });

  it("uses tabular figures so columns of prices line up", () => {
    render(<Price paise={64000} />);
    expect(screen.getByText("₹640")).toHaveClass("tabular-nums");
  });
});
