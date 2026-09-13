import { redirect } from "next/navigation";

export default function UserSettingsIndexPage() {
  redirect("/settings/profile");
}
