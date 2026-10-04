export type CheckState = "none" | "some" | "all";

export function getCheckState(ids: readonly string[], checkedIds: ReadonlySet<string>): CheckState {
  const checkedCount = ids.filter((id) => checkedIds.has(id)).length;
  if (checkedCount === 0) return "none";
  return checkedCount === ids.length ? "all" : "some";
}
