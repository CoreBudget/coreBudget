import geoip from "geoip-lite";

function isLocalOrPrivate(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.")) return true;
  const v4 = ip.replace(/^::ffff:/, "");
  return (
    v4.startsWith("10.") || v4.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(v4)
  );
}

export function lookupLocation(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (isLocalOrPrivate(ip)) return "Local network";

  const result = geoip.lookup(ip);
  if (!result) return null;

  const { city, region, country } = result;
  if (city && region) return `${city}, ${region}`;
  if (city) return `${city}, ${country}`;
  if (region) return `${region}, ${country}`;
  return country || null;
}
