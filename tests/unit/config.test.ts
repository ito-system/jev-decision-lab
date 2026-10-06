import { describe, expect, it } from "vitest";
import { getServerMode, resolveMode } from "@/lib/jev/config";

describe("getServerMode", () => {
  it.each([
    [undefined, "live"],
    ["", "live"],
    ["live", "live"],
    [" LIVE ", "live"],
    ["mock", "mock"],
    ["Mock", "mock"],
  ] as const)("JEV_DEMO_MODE=%j なら %s", (value, expected) => {
    expect(getServerMode({ JEV_DEMO_MODE: value })).toBe(expected);
  });

  it("想定外の値なら Jev API を呼ばない mock に倒す", () => {
    expect(getServerMode({ JEV_DEMO_MODE: "liev" })).toBe("mock");
  });
});

describe("resolveMode", () => {
  it("サーバーが live のとき、ブラウザから mock を指定できる", () => {
    expect(resolveMode("live", "mock")).toBe("mock");
  });

  it("サーバーが live で指定がなければ live", () => {
    expect(resolveMode("live", undefined)).toBe("live");
  });

  it("サーバーが mock のときは、ブラウザから live を指定しても mock のまま", () => {
    expect(resolveMode("mock", "live")).toBe("mock");
  });
});
