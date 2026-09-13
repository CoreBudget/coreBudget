import { Suspense } from "react";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSetupStep } from "@/lib/platform";
import { getCurrentSession } from "@/lib/auth/session";
import { createTotpSecret, totpKeyUri } from "@/lib/auth/totp";
import AuthShell from "../_shared/AuthShell";
import StepDots from "./StepDots";
import AdminAccountForm from "./AdminAccountForm";
import { AccountForm, BudgetForm, HouseholdForm, InviteForm } from "./SetupSteps";
import LoginForm from "../login/LoginForm";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("setup.metaTitle") };
}

const STEP_INDEX: Record<string, number> = {
  admin: 0,
  household: 1,
  budget: 2,
  account: 3,
  invite: 4,
};

export default async function SetupPage() {
  const step = await getSetupStep();
  if (step === null) {
    redirect("/dashboard");
  }

  let stepContent: ReactNode;

  if (step === "admin") {
    const secret = createTotpSecret();
    const qrDataUrl = await QRCode.toDataURL(totpKeyUri(secret, "admin"));
    stepContent = <AdminAccountForm secret={secret} qrDataUrl={qrDataUrl} />;
  } else {
    const session = await getCurrentSession();
    if (!session) {
      return (
        <Suspense>
          <LoginForm />
        </Suspense>
      );
    }
    if (step === "household") stepContent = <HouseholdForm />;
    else if (step === "budget") stepContent = <BudgetForm />;
    else if (step === "account") stepContent = <AccountForm />;
    else stepContent = <InviteForm />;
  }

  return (
    <AuthShell maxWidth={560} aboveCard={<StepDots activeIndex={STEP_INDEX[step]} />}>
      {stepContent}
    </AuthShell>
  );
}
