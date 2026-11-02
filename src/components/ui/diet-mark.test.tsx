import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DietMark } from "./diet-mark";

describe("DietMark", () => {
  it.each([
    ["veg", "Vegetarian"],
    ["non_veg", "Non-vegetarian"],
    ["egg", "Contains egg"],
  ] as const)("labels %s for screen readers", (diet, name) => {
    render(<DietMark diet={diet} />);
    expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });

  it("draws a dot for veg and a triangle for non-veg, so colour is never the only signal", () => {
    const { container, rerender } = render(<DietMark diet="veg" />);
    expect(container.querySelector("circle")).not.toBeNull();
    rerender(<DietMark diet="non_veg" />);
    expect(container.querySelector("polygon")).not.toBeNull();
  });
});
