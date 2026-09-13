import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import HomeIcon from "@mui/icons-material/Home";
import TerrainIcon from "@mui/icons-material/Terrain";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CategoryIcon from "@mui/icons-material/Category";
import SchoolIcon from "@mui/icons-material/School";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import SavingsIcon from "@mui/icons-material/Savings";
import CreditCardIcon from "@mui/icons-material/CreditCard";

export const ASSET_TYPE_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  property: HomeIcon,
  land: TerrainIcon,
  vehicle: DirectionsCarIcon,
  investment: TrendingUpIcon,
  other: CategoryIcon,
};

export const LIABILITY_TYPE_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  mortgage: HomeIcon,
  auto_loan: DirectionsCarIcon,
  student_loan: SchoolIcon,
  medical_debt: LocalHospitalIcon,
  personal_loan: RequestQuoteIcon,
};

export const NET_WORTH_CATEGORY_ICONS = {
  assets: SavingsIcon,
  liabilities: CreditCardIcon,
} as const;
