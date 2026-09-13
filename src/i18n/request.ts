import { getRequestConfig } from "next-intl/server";
import { getEffectiveLocale } from "@/lib/i18n/locale";

export default getRequestConfig(async () => {
  const locale = await getEffectiveLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
