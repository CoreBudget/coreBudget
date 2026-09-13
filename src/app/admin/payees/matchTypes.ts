export const MATCH_TYPES = ["contains", "starts_with", "ends_with", "equals"] as const;

export const MATCH_TYPE_LABEL_KEYS: Record<string, string> = {
  contains: "admin.payees.matchTypes.contains",
  starts_with: "admin.payees.matchTypes.startsWith",
  ends_with: "admin.payees.matchTypes.endsWith",
  equals: "admin.payees.matchTypes.equals",
};
