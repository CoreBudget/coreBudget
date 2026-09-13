const COLORS = {
  pageBackground: "#f2f3f5",
  cardBackground: "#ffffff",
  border: "rgba(15,20,30,0.09)",
  textPrimary: "#14171c",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  blue: "#356ec3",
  blueHover: "#2d6fd0",
  blueContrast: "#ffffff",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerHtml?: string;
}): string {
  const logoUrl = new URL("/icons/icon-192.png", process.env.APP_URL).toString();
  const escapedUrl = escapeHtml(opts.ctaUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CoreBudget</title>
  </head>
  <body
    style="margin:0; padding:0; background-color:${COLORS.pageBackground}; font-family:'IBM Plex Sans', Helvetica, Arial, sans-serif;"
  >
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(opts.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.pageBackground};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="max-width:480px; background-color:${COLORS.cardBackground}; border:1px solid ${COLORS.border}; border-radius:12px; overflow:hidden;"
          >
            <tr>
              <td align="center" style="padding:32px 32px 16px 32px;">
                <img
                  src="${logoUrl}"
                  alt="CoreBudget"
                  width="56"
                  height="56"
                  style="display:block; border-radius:12px;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <h1
                  style="margin:0 0 16px 0; font-size:20px; line-height:28px; font-weight:700; color:${COLORS.textPrimary}; text-align:center;"
                >
                  ${escapeHtml(opts.heading)}
                </h1>
                <div style="font-size:15px; line-height:24px; color:${COLORS.textSecondary};">
                  ${opts.bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td
                      align="center"
                      style="border-radius:8px; background-color:${COLORS.blue};"
                    >
                      <a
                        href="${escapedUrl}"
                        style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:${COLORS.blueContrast}; text-decoration:none; border-radius:8px;"
                      >
                        ${escapeHtml(opts.ctaLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px;">
                <p style="margin:16px 0 0 0; font-size:13px; line-height:20px; color:${COLORS.textMuted}; text-align:center;">
                  If the button above doesn't work, copy and paste this link into your browser:
                  <br />
                  <a href="${escapedUrl}" style="color:${COLORS.blue}; word-break:break-all;">${escapedUrl}</a>
                </p>
                ${opts.footerHtml ?? ""}
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0 0; font-size:12px; color:${COLORS.textMuted};">
            Sent by CoreBudget, your self-hosted budgeting app.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
