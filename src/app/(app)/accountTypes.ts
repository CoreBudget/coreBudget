import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SavingsIcon from "@mui/icons-material/Savings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CreditCardIcon from "@mui/icons-material/CreditCard";

export const ACCOUNT_TYPE_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  checking: LocalAtmIcon,
  cash: AccountBalanceWalletIcon,
  savings: SavingsIcon,
  investment: TrendingUpIcon,
  credit: CreditCardIcon,
  line_credit: CreditCardIcon,
};
