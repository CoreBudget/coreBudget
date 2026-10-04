import { describe, expect, it } from "vitest";
import { getCheckState } from "./selectionState";

describe("getCheckState", () => {
  const ids = ["a", "b", "c"];

  it("is none when nothing is checked", () => {
    expect(getCheckState(ids, new Set())).toBe("none");
  });

  it("is some when only part of the ids are checked", () => {
    expect(getCheckState(ids, new Set(["b"]))).toBe("some");
  });

  it("is all when every id is checked", () => {
    expect(getCheckState(ids, new Set(["a", "b", "c"]))).toBe("all");
  });

  it("is none for an empty id list, even when other ids are checked", () => {
    expect(getCheckState([], new Set(["x"]))).toBe("none");
  });

  it("ignores checked ids that are not in the list", () => {
    expect(getCheckState(ids, new Set(["a", "b", "c", "x"]))).toBe("all");
    expect(getCheckState(ids, new Set(["x"]))).toBe("none");
  });
});
