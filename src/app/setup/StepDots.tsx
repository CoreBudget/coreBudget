import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

export default async function StepDots({ activeIndex }: { activeIndex: number }) {
  const t = await getTranslations();
  const STEPS = [
    t("setup.steps.adminAccount"),
    t("setup.steps.household"),
    t("setup.steps.firstBudget"),
    t("setup.steps.firstAccount"),
    t("setup.steps.inviteOptional"),
  ];
  return (
    <Stack direction="row" sx={{ gap: "6px", mb: "28px" }}>
      {STEPS.map((label, i) => (
        <Box
          key={label}
          title={label}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: i <= activeIndex ? "primary.main" : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </Stack>
  );
}
