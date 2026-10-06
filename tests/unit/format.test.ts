import { describe, expect, it } from "vitest";
import { formatConfidence, formatPercent, formatScore, formatSeconds } from "@/lib/format";

describe("formatPercent", () => {
  it.each([
    [0, "0%"],
    [0.003, "<1%"],
    [0.005, "1%"],
    [0.91, "91%"],
    [0.9951, ">99%"],
    [1, "100%"],
  ])("%f → %s", (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe("formatScore", () => {
  it.each([
    [3.64, "3.6"],
    [4, "4.0"],
    [0, "0.0"],
    [0.26, "0.3"],
  ])("%f → %s", (value, expected) => {
    expect(formatScore(value)).toBe(expected);
  });
});

describe("formatConfidence", () => {
  it("小数2桁で表示する", () => {
    expect(formatConfidence(0.8875)).toBe("0.89");
    expect(formatConfidence(1)).toBe("1.00");
  });
});

describe("formatSeconds", () => {
  it("ミリ秒を秒（小数2桁）で表示する", () => {
    expect(formatSeconds(412)).toBe("0.41秒");
    expect(formatSeconds(1234)).toBe("1.23秒");
  });
});
