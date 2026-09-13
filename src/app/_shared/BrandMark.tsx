import Box from "@mui/material/Box";

export default function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "6px",
        overflow: "hidden",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon.svg" alt="" width={size} height={size} />
    </Box>
  );
}
