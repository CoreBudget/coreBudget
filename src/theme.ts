"use client";

import { createTheme, useColorScheme } from "@mui/material/styles";

export const darkTokens = {
  pageBackground: "#0b0e12",
  shellBackground: "#0f1216",
  topBarBackground: "#141820",
  cardBackground: "#161a20",
  menuBackground: "#1b2027",
  inputBackground: "#12151a",
  hoverBackground: "#1e242c",
  hoverBackgroundStrong: "#232a33",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  inputBorder: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.08)",
  textPrimary: "#f0f2f5",
  textBody: "#e6e9ed",
  textSecondary: "#c7cdd6",
  textMuted: "#8b93a0",
  textFaint: "#7d8590",
  textDisabled: "#5c6470",
  blue: "#5b9bf5",
  blueHover: "#7fb0f8",
  blueContrast: "#0d1420",
  red: "#e5695f",
  green: "#57b878",
  amber: "#e0a94a",
  cashPositive: "#8fce9e",
  creditNegative: "#e5847d",
  cardShadow: "0 20px 60px rgba(0,0,0,0.4)",
  menuShadow: "0 4px 14px rgba(0,0,0,0.35)",
} as const;

const lightTokens: Record<keyof typeof darkTokens, string> = {
  pageBackground: "#f2f3f5",
  shellBackground: "#ffffff",
  topBarBackground: "#ffffff",
  cardBackground: "#ffffff",
  menuBackground: "#ffffff",
  inputBackground: "#f7f8fa",
  hoverBackground: "#eef0f2",
  hoverBackgroundStrong: "#e3e6e9",
  border: "rgba(15,20,30,0.09)",
  borderStrong: "rgba(15,20,30,0.14)",
  inputBorder: "rgba(15,20,30,0.16)",
  divider: "rgba(15,20,30,0.09)",
  textPrimary: "#14171c",
  textBody: "#20242b",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  textFaint: "#6a6e75",
  textDisabled: "#b0b4ba",
  blue: "#356ec3",
  blueHover: "#2d6fd0",
  blueContrast: "#ffffff",
  red: "#d1453a",
  green: "#297e50",
  amber: "#986319",
  cashPositive: "#2f8f5b",
  creditNegative: "#d1453a",
  cardShadow: "0 8px 24px rgba(20,22,30,0.08)",
  menuShadow: "0 4px 12px rgba(20,22,30,0.10)",
};

export function useTokens(): Record<keyof typeof darkTokens, string> {
  const { mode } = useColorScheme();
  const resolved = mode === "system" ? "dark" : (mode ?? "dark");
  return resolved === "light" ? lightTokens : darkTokens;
}

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    dark: {
      palette: {
        background: {
          default: darkTokens.pageBackground,
          paper: darkTokens.cardBackground,
        },
        primary: {
          main: darkTokens.blue,
          contrastText: darkTokens.blueContrast,
        },
        error: { main: darkTokens.red },
        success: { main: darkTokens.green },
        warning: { main: darkTokens.amber },
        text: {
          primary: darkTokens.textBody,
          secondary: darkTokens.textMuted,
          disabled: darkTokens.textDisabled,
        },
        divider: darkTokens.divider,
        action: {
          hover: darkTokens.hoverBackground,
          disabled: darkTokens.textDisabled,
          disabledBackground: darkTokens.hoverBackgroundStrong,
        },
      },
    },
    light: {
      palette: {
        background: {
          default: lightTokens.pageBackground,
          paper: lightTokens.cardBackground,
        },
        primary: {
          main: lightTokens.blue,
          contrastText: lightTokens.blueContrast,
        },
        error: { main: lightTokens.red },
        success: { main: lightTokens.green },
        warning: { main: lightTokens.amber },
        text: {
          primary: lightTokens.textBody,
          secondary: lightTokens.textMuted,
          disabled: lightTokens.textDisabled,
        },
        divider: lightTokens.divider,
        action: {
          hover: lightTokens.hoverBackground,
          disabled: lightTokens.textDisabled,
          disabledBackground: lightTokens.hoverBackgroundStrong,
        },
      },
    },
  },
  defaultColorScheme: "dark",
  shape: {
    borderRadius: 7,
  },
  typography: {
    fontFamily: "var(--font-roboto), Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 13.5,
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: "none",
          ...theme.applyStyles("dark", {
            border: `1px solid ${darkTokens.borderStrong}`,
            boxShadow: darkTokens.menuShadow,
          }),
          ...theme.applyStyles("light", {
            border: `1px solid ${lightTokens.borderStrong}`,
            boxShadow: lightTokens.menuShadow,
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: "none",
          borderRadius: 14,
          ...theme.applyStyles("dark", {
            border: `1px solid ${darkTokens.border}`,
            boxShadow: darkTokens.cardShadow,
          }),
          ...theme.applyStyles("light", {
            border: `1px solid ${lightTokens.border}`,
            boxShadow: lightTokens.cardShadow,
          }),
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 7,
          fontSize: 13.5,
          padding: "11px 20px",
          "&.Mui-disabled": {
            cursor: "not-allowed",
            pointerEvents: "auto",
          },
        },
        outlined: ({ theme }) => ({
          ...theme.applyStyles("dark", {
            borderColor: darkTokens.borderStrong,
            color: darkTokens.textSecondary,
          }),
          ...theme.applyStyles("light", {
            borderColor: lightTokens.borderStrong,
            color: lightTokens.textSecondary,
          }),
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          "&.Mui-disabled": {
            cursor: "not-allowed",
            pointerEvents: "auto",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          fontSize: 13.5,
          ...theme.applyStyles("dark", {
            backgroundColor: darkTokens.inputBackground,
            "& fieldset": { borderColor: darkTokens.inputBorder },
          }),
          ...theme.applyStyles("light", {
            backgroundColor: lightTokens.inputBackground,
            "& fieldset": { borderColor: lightTokens.inputBorder },
          }),
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: 12.5,
          fontWeight: 600,
          ...theme.applyStyles("dark", { color: darkTokens.textSecondary }),
          ...theme.applyStyles("light", { color: lightTokens.textSecondary }),
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: 12.5,
          borderRadius: 6,
        },
      },
    },
  },
});

export default theme;
