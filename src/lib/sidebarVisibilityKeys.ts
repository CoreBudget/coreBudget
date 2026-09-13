export const SIDEBAR_VISIBILITY_KEYS = {
  dashboard: { defaultVisible: false },
  accountDetail: { defaultVisible: true },
  budget: { defaultVisible: true },
  plan: { defaultVisible: true },
  netWorthList: { defaultVisible: false },
  netWorthDetail: { defaultVisible: true },
  reports: { defaultVisible: false },
  subscriptions: { defaultVisible: false },
  incomeCalculator: { defaultVisible: false },
  budgetSettings: { defaultVisible: false },
  settings: { defaultVisible: false },
  admin: { defaultVisible: false },
} as const;

export type SidebarPageKey = keyof typeof SIDEBAR_VISIBILITY_KEYS;

export const SIDEBAR_VISIBILITY_KEY_LIST = Object.keys(SIDEBAR_VISIBILITY_KEYS) as SidebarPageKey[];

export function isSidebarPageKey(value: string): value is SidebarPageKey {
  return value in SIDEBAR_VISIBILITY_KEYS;
}

export function pathnameToSidebarPageKey(pathname: string): SidebarPageKey {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/accounts/")) return "accountDetail";
  if (pathname === "/budget") return "budget";
  if (pathname === "/plan") return "plan";
  if (pathname === "/net-worth") return "netWorthList";
  if (pathname.startsWith("/net-worth/")) return "netWorthDetail";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname === "/subscriptions") return "subscriptions";
  if (pathname === "/income-calculator") return "incomeCalculator";
  if (pathname.startsWith("/budget-settings")) return "budgetSettings";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/admin")) return "admin";
  return "dashboard";
}
