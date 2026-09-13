"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PieChartIcon from "@mui/icons-material/PieChart";
import SettingsIcon from "@mui/icons-material/Settings";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalculateIcon from "@mui/icons-material/Calculate";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTokens } from "@/theme";
import SkipLink from "../_shared/SkipLink";
import ThemeToggle from "../_shared/ThemeToggle";
import { TourProvider } from "../_shared/tours/TourProvider";
import { useTour } from "../_shared/tours/useTour";
import HelpTourButton from "../_shared/tours/HelpTourButton";
import NavIconLabel from "../_shared/NavIconLabel";
import BrandMark from "../_shared/BrandMark";
import { updateSidebarGroupOpenAction } from "../_shared/sidebarActions";
import TopNavLink from "./TopNavLink";
import SidebarNavLink from "./SidebarNavLink";
import CollapsibleGroup from "./CollapsibleGroup";
import BudgetSwitcher from "./BudgetSwitcher";
import AvatarMenu from "./AvatarMenu";
import QuickAddMenu from "./QuickAddMenu";
import NotificationBell from "./NotificationBell";
import MobileTabBar from "./MobileTabBar";
import MobileMoreSheet from "./MobileMoreSheet";
import { useIsMobile } from "./useIsMobile";
import { formatCurrency } from "@/lib/currency";
import { ACCOUNT_TYPE_ICONS } from "./accountTypes";
import { ASSET_TYPE_ICONS, LIABILITY_TYPE_ICONS } from "./net-worth/netWorthTypeIcons";
import { pathnameToSidebarPageKey, type SidebarPageKey } from "@/lib/sidebarVisibilityKeys";
import type {
  AccessibleHousehold,
  CurrentWorkspace,
  SidebarAccounts,
  SidebarNetWorth,
} from "@/lib/workspace";

const SIDEBAR_WIDTH = 320;

interface AppShellProps {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  currencyCode: string;
  locale: string | null;
  sidebarAccountsOpen: boolean;
  sidebarNetWorthOpen: boolean;
  sidebarVisibilityByPage: Record<SidebarPageKey, boolean>;
  incomeCalculatorEnabled: boolean;
  households: AccessibleHousehold[];
  workspace: CurrentWorkspace | null;
  permissions: Record<string, string> | null;
  accounts: SidebarAccounts | null;
  netWorth: SidebarNetWorth | null;
  seenTours: string[];
  children: ReactNode;
}

export default function AppShell(props: AppShellProps) {
  return (
    <TourProvider initialSeenTours={props.seenTours}>
      <AppShellInner {...props} />
    </TourProvider>
  );
}

function AppShellInner({
  userName,
  userEmail,
  isAdmin,
  currencyCode,
  locale,
  sidebarAccountsOpen: initialSidebarAccountsOpen,
  sidebarNetWorthOpen: initialSidebarNetWorthOpen,
  sidebarVisibilityByPage,
  incomeCalculatorEnabled,
  households,
  workspace,
  permissions,
  accounts,
  netWorth,
  children,
}: AppShellProps) {
  const tokens = useTokens();
  const t = useTranslations();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isSidebarVisibleFor = (path: string) =>
    sidebarVisibilityByPage[pathnameToSidebarPageKey(path)];
  const [sidebarOpen, setSidebarOpen] = useState(() => isSidebarVisibleFor(pathname));
  const [moreOpen, setMoreOpen] = useState(false);
  const [trackedPathname, setTrackedPathname] = useState(pathname);
  const [accountsGroupOpen, setAccountsGroupOpen] = useState(initialSidebarAccountsOpen);
  const [netWorthGroupOpen, setNetWorthGroupOpen] = useState(initialSidebarNetWorthOpen);
  const [trackedAccountsPref, setTrackedAccountsPref] = useState(initialSidebarAccountsOpen);
  const [trackedNetWorthPref, setTrackedNetWorthPref] = useState(initialSidebarNetWorthOpen);

  function toggleAccountsGroup(open: boolean) {
    setAccountsGroupOpen(open);
    void updateSidebarGroupOpenAction("accounts", open);
  }

  function toggleNetWorthGroup(open: boolean) {
    setNetWorthGroupOpen(open);
    void updateSidebarGroupOpenAction("netWorth", open);
  }

  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    setSidebarOpen(isSidebarVisibleFor(pathname));
    setMoreOpen(false);
  }

  if (initialSidebarAccountsOpen !== trackedAccountsPref) {
    setTrackedAccountsPref(initialSidebarAccountsOpen);
    setAccountsGroupOpen(initialSidebarAccountsOpen);
  }
  if (initialSidebarNetWorthOpen !== trackedNetWorthPref) {
    setTrackedNetWorthPref(initialSidebarNetWorthOpen);
    setNetWorthGroupOpen(initialSidebarNetWorthOpen);
  }

  const canSee = (feature: string) => (permissions ? permissions[feature] !== "no_access" : false);

  useTour(
    "welcome",
    workspace
      ? isMobile
        ? [
            {
              element: '[data-tour="welcome-mobile-switcher"]',
              title: t("tour.welcome.mobileBudgetSwitcher.title"),
              description: t("tour.welcome.mobileBudgetSwitcher.description"),
              side: "bottom",
            },
            {
              element: '[data-tour="welcome-mobile-tabbar"]',
              title: t("tour.welcome.mobileTabBar.title"),
              description: t("tour.welcome.mobileTabBar.description"),
              side: "top",
            },
            {
              element: '[data-tour="welcome-mobile-more"]',
              title: t("tour.welcome.mobileMore.title"),
              description: t("tour.welcome.mobileMore.description"),
              side: "top",
            },
          ]
        : [
            {
              element: '[data-tour="welcome-plan"]',
              title: t("tour.welcome.plan.title"),
              description: t("tour.welcome.plan.description"),
              side: "right",
            },
            {
              element: '[data-tour="welcome-budget"]',
              title: t("tour.welcome.budget.title"),
              description: t("tour.welcome.budget.description"),
              side: "right",
            },
            {
              element: '[data-tour="welcome-accounts-networth"]',
              title: t("tour.welcome.accountsNetWorth.title"),
              description: t("tour.welcome.accountsNetWorth.description"),
              side: "right",
            },
            {
              element: '[data-tour="welcome-add-button"]',
              title: t("tour.welcome.addButton.title"),
              description: t("tour.welcome.addButton.description"),
              side: "bottom",
            },
            {
              element: '[data-tour="welcome-user-menu"]',
              title: t("tour.welcome.userMenu.title"),
              description: t("tour.welcome.userMenu.description"),
              side: "bottom",
            },
            {
              element: '[data-tour="welcome-settings"]',
              title: t("tour.welcome.settings.title"),
              description: t("tour.welcome.settings.description"),
              side: "right",
            },
          ]
      : [],
    { slot: "welcome" },
  );

  if (isMobile) {
    return (
      <Box
        sx={{
          height: "100dvh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <SkipLink />
        <Stack
          direction="row"
          sx={{ height: 52, flex: "none", alignItems: "center", gap: "10px", px: "14px" }}
          style={{
            backgroundColor: tokens.topBarBackground,
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          {workspace ? (
            <Box data-tour="welcome-mobile-switcher" sx={{ flex: 1, minWidth: 0 }}>
              <BudgetSwitcher
                households={households}
                currentHouseholdName={workspace.household.name}
                currentBudgetName={workspace.budget.name}
                variant="topbar"
              />
            </Box>
          ) : (
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: 1, fontSize: 15, fontWeight: 700, flex: 1 }}
              style={{ color: tokens.textPrimary }}
            >
              <BrandMark size={28} />
              CoreBudget
            </Stack>
          )}
          <NotificationBell />
          <HelpTourButton />
          <ThemeToggle />
          <AvatarMenu userName={userName} userEmail={userEmail} isAdmin={isAdmin} />
        </Stack>

        <Box
          id="main-content"
          sx={{ flex: 1, overflowY: moreOpen ? "hidden" : "auto", position: "relative" }}
        >
          {!workspace ? (
            <Box sx={{ p: 3 }}>
              <Typography
                component="h1"
                sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}
                style={{ color: tokens.textBody }}
              >
                {t("appShell.nav.noBudgetAccessTitle")}
              </Typography>
              <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textMuted }}>
                {t("appShell.nav.noBudgetAccessSubtitle")}
              </Typography>
            </Box>
          ) : (
            children
          )}
          {workspace && moreOpen && (
            <MobileMoreSheet
              canSee={canSee}
              incomeCalculatorEnabled={incomeCalculatorEnabled}
              onNavigate={() => setMoreOpen(false)}
              onClose={() => setMoreOpen(false)}
            />
          )}
        </Box>

        {workspace && (
          <MobileTabBar moreOpen={moreOpen} onToggleMore={() => setMoreOpen((o) => !o)} />
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100dvh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <SkipLink />
      <Stack
        direction="row"
        sx={{
          height: 56,
          flex: "none",
          alignItems: "center",
          gap: "20px",
          px: 3,
          borderBottom: `1px solid ${tokens.border}`,
        }}
        style={{ backgroundColor: tokens.topBarBackground }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            fontSize: 17,
            fontWeight: 700,
            color: "text.primary",
            whiteSpace: "nowrap",
          }}
        >
          <BrandMark size={30} />
          CoreBudget
        </Stack>

        <Stack direction="row" sx={{ gap: "4px", flex: 1 }}>
          <TopNavLink href="/dashboard">
            <NavIconLabel icon={SpaceDashboardIcon} label={t("appShell.nav.dashboard")} />
          </TopNavLink>
          {workspace && canSee("subscriptions") && (
            <TopNavLink href="/subscriptions">
              <NavIconLabel icon={SubscriptionsIcon} label={t("appShell.nav.subscriptions")} />
            </TopNavLink>
          )}
          {workspace && canSee("reports") && (
            <TopNavLink href="/reports">
              <NavIconLabel icon={AssessmentIcon} label={t("appShell.nav.reports")} />
            </TopNavLink>
          )}
          {incomeCalculatorEnabled && (
            <TopNavLink href="/income-calculator">
              <NavIconLabel icon={CalculateIcon} label={t("appShell.nav.incomeCalculator")} />
            </TopNavLink>
          )}
        </Stack>

        <Stack direction="row" sx={{ alignItems: "center", gap: "6px" }}>
          <Box data-tour="welcome-add-button">
            <QuickAddMenu />
          </Box>
          <NotificationBell />
          <HelpTourButton />
          <ThemeToggle />
          <Box data-tour="welcome-user-menu">
            <AvatarMenu userName={userName} userEmail={userEmail} isAdmin={isAdmin} />
          </Box>
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {workspace && (
          <Stack
            component="nav"
            sx={{
              width: sidebarOpen ? SIDEBAR_WIDTH : 0,
              flex: "none",
              display: "flex",
              flexDirection: "column",
              p: sidebarOpen ? "14px 12px" : 0,
              borderRight: sidebarOpen ? `1px solid ${tokens.border}` : "none",
              overflow: "hidden",
              transition: "width 0.18s ease",
            }}
          >
            {sidebarOpen && (
              <>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
                  <BudgetSwitcher
                    households={households}
                    currentHouseholdName={workspace.household.name}
                    currentBudgetName={workspace.budget.name}
                  />

                  {canSee("plan") && (
                    <Box data-tour="welcome-plan">
                      <SidebarNavLink href="/plan">
                        <NavIconLabel icon={AssignmentIcon} label={t("appShell.nav.plan")} />
                      </SidebarNavLink>
                    </Box>
                  )}
                  {canSee("budget_envelope") && (
                    <Box data-tour="welcome-budget">
                      <SidebarNavLink href="/budget">
                        <NavIconLabel icon={PieChartIcon} label={t("appShell.nav.budget")} />
                      </SidebarNavLink>
                    </Box>
                  )}

                  <Box data-tour="welcome-accounts-networth">
                    {canSee("transactions") && accounts && (
                      <CollapsibleGroup
                        label={t("appShell.nav.accountsGroup")}
                        open={accountsGroupOpen}
                        onOpenChange={toggleAccountsGroup}
                      >
                        <Typography
                          sx={{ fontSize: 11, px: "8px", pt: "6px", pb: "2px" }}
                          style={{ color: tokens.textFaint }}
                        >
                          {t("appShell.nav.cash")}
                        </Typography>
                        {accounts.cash.length === 0 && (
                          <Typography
                            sx={{ fontSize: 12, px: "8px", py: "4px" }}
                            style={{ color: tokens.textDisabled }}
                          >
                            {t("appShell.nav.noCashAccounts")}
                          </Typography>
                        )}
                        {accounts.cash.map((a) => {
                          const AccountIcon = ACCOUNT_TYPE_ICONS[a.type];
                          return (
                            <SidebarNavLink key={a.id} href={`/accounts/${a.id}`}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    overflow: "hidden",
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  {AccountIcon && (
                                    <AccountIcon sx={{ fontSize: 16, flex: "none" }} />
                                  )}
                                  <span
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {a.name}
                                  </span>
                                </Box>
                                <span
                                  style={{
                                    color: tokens.cashPositive,
                                    fontWeight: 500,
                                    flex: "none",
                                    marginLeft: "8px",
                                  }}
                                >
                                  {formatCurrency(a.balance, locale, currencyCode)}
                                </span>
                              </Box>
                            </SidebarNavLink>
                          );
                        })}

                        <Typography
                          sx={{ fontSize: 11, px: "8px", pt: "8px", pb: "2px" }}
                          style={{ color: tokens.textFaint }}
                        >
                          {t("appShell.nav.credit")}
                        </Typography>
                        {accounts.credit.length === 0 && (
                          <Typography
                            sx={{ fontSize: 12, px: "8px", py: "4px" }}
                            style={{ color: tokens.textDisabled }}
                          >
                            {t("appShell.nav.noCreditAccounts")}
                          </Typography>
                        )}
                        {accounts.credit.map((a) => {
                          const AccountIcon = ACCOUNT_TYPE_ICONS[a.type];
                          return (
                            <SidebarNavLink key={a.id} href={`/accounts/${a.id}`}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    overflow: "hidden",
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  {AccountIcon && (
                                    <AccountIcon sx={{ fontSize: 16, flex: "none" }} />
                                  )}
                                  <span
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {a.name}
                                  </span>
                                </Box>
                                <span
                                  style={{
                                    color: tokens.creditNegative,
                                    fontWeight: 500,
                                    flex: "none",
                                    marginLeft: "8px",
                                  }}
                                >
                                  {formatCurrency(a.balance, locale, currencyCode)}
                                </span>
                              </Box>
                            </SidebarNavLink>
                          );
                        })}
                      </CollapsibleGroup>
                    )}

                    {(canSee("net_worth_assets") || canSee("net_worth_liabilities")) &&
                      netWorth && (
                        <CollapsibleGroup
                          label={t("appShell.nav.netWorthGroup")}
                          open={netWorthGroupOpen}
                          onOpenChange={toggleNetWorthGroup}
                        >
                          {canSee("net_worth_assets") && (
                            <>
                              <Typography
                                sx={{ fontSize: 11, px: "8px", pt: "6px", pb: "2px" }}
                                style={{ color: tokens.textFaint }}
                              >
                                {t("appShell.nav.assets")}
                              </Typography>
                              {netWorth.assets.length === 0 && (
                                <Typography
                                  sx={{ fontSize: 12, px: "8px", py: "4px" }}
                                  style={{ color: tokens.textDisabled }}
                                >
                                  {t("appShell.nav.noAssetsYet")}
                                </Typography>
                              )}
                              {netWorth.assets.map((a) => {
                                const AssetIcon = ASSET_TYPE_ICONS[a.type];
                                return (
                                  <SidebarNavLink key={a.id} href={`/net-worth/assets/${a.id}`}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          overflow: "hidden",
                                          flex: 1,
                                          minWidth: 0,
                                        }}
                                      >
                                        {AssetIcon && (
                                          <AssetIcon sx={{ fontSize: 16, flex: "none" }} />
                                        )}
                                        <span
                                          style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {a.name}
                                        </span>
                                      </Box>
                                      <span
                                        style={{
                                          color: tokens.cashPositive,
                                          fontWeight: 500,
                                          flex: "none",
                                          marginLeft: "8px",
                                        }}
                                      >
                                        {formatCurrency(a.value, locale, currencyCode)}
                                      </span>
                                    </Box>
                                  </SidebarNavLink>
                                );
                              })}
                            </>
                          )}

                          {canSee("net_worth_liabilities") && (
                            <>
                              <Typography
                                sx={{ fontSize: 11, px: "8px", pt: "8px", pb: "2px" }}
                                style={{ color: tokens.textFaint }}
                              >
                                {t("appShell.nav.liabilities")}
                              </Typography>
                              {netWorth.liabilities.length === 0 && (
                                <Typography
                                  sx={{ fontSize: 12, px: "8px", py: "4px" }}
                                  style={{ color: tokens.textDisabled }}
                                >
                                  {t("appShell.nav.noLiabilitiesYet")}
                                </Typography>
                              )}
                              {netWorth.liabilities.map((l) => {
                                const LiabilityIcon = LIABILITY_TYPE_ICONS[l.type];
                                return (
                                  <SidebarNavLink
                                    key={l.id}
                                    href={`/net-worth/liabilities/${l.id}`}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          overflow: "hidden",
                                          flex: 1,
                                          minWidth: 0,
                                        }}
                                      >
                                        {LiabilityIcon && (
                                          <LiabilityIcon sx={{ fontSize: 16, flex: "none" }} />
                                        )}
                                        <span
                                          style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {l.name}
                                        </span>
                                      </Box>
                                      <span
                                        style={{
                                          color: tokens.creditNegative,
                                          fontWeight: 500,
                                          flex: "none",
                                          marginLeft: "8px",
                                        }}
                                      >
                                        {formatCurrency(l.value, locale, currencyCode)}
                                      </span>
                                    </Box>
                                  </SidebarNavLink>
                                );
                              })}
                            </>
                          )}
                        </CollapsibleGroup>
                      )}
                  </Box>
                </Box>

                <Box sx={{ flex: "none" }}>
                  <Box
                    sx={{ height: "1px", my: "8px", mx: "4px" }}
                    style={{ backgroundColor: tokens.divider }}
                  />
                  {canSee("budget_settings") && (
                    <Box data-tour="welcome-settings">
                      <SidebarNavLink href="/budget-settings" muted>
                        <NavIconLabel
                          icon={SettingsIcon}
                          label={t("appShell.nav.budgetSettings")}
                        />
                      </SidebarNavLink>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Stack>
        )}

        {workspace && (
          <Box
            component="button"
            onClick={() => setSidebarOpen((o) => !o)}
            title={
              sidebarOpen ? t("appShell.nav.collapseSidebar") : t("appShell.nav.expandSidebar")
            }
            sx={{
              position: "relative",
              flex: "none",
              alignSelf: "flex-start",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
              mt: "84px",
              ...(sidebarOpen
                ? { ml: "-14px", width: 28, height: 28, borderRadius: "50%" }
                : { ml: 0, width: 18, height: 34, borderRadius: "0 17px 17px 0" }),
            }}
            style={{
              backgroundColor: tokens.menuBackground,
              borderTop: `1px solid ${tokens.borderStrong}`,
              borderRight: `1px solid ${tokens.borderStrong}`,
              borderBottom: `1px solid ${tokens.borderStrong}`,
              borderLeft: sidebarOpen ? `1px solid ${tokens.borderStrong}` : "none",
            }}
          >
            {sidebarOpen ? (
              <ChevronLeftIcon sx={{ fontSize: 20 }} style={{ color: tokens.textSecondary }} />
            ) : (
              <ChevronRightIcon sx={{ fontSize: 20 }} style={{ color: tokens.textSecondary }} />
            )}
          </Box>
        )}

        <Box id="main-content" sx={{ flex: 1, overflowY: "auto" }}>
          {!workspace ? (
            <Box sx={{ p: 5, maxWidth: 480 }}>
              <Typography
                component="h1"
                sx={{ fontSize: 20, fontWeight: 700, mb: 1 }}
                style={{ color: tokens.textBody }}
              >
                {t("appShell.nav.noBudgetAccessTitle")}
              </Typography>
              <Typography sx={{ fontSize: 13.5 }} style={{ color: tokens.textMuted }}>
                {t("appShell.nav.noBudgetAccessSubtitle")}
              </Typography>
            </Box>
          ) : (
            children
          )}
        </Box>
      </Stack>
    </Box>
  );
}
