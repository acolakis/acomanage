import { StyleSheet } from "@react-pdf/renderer";
import { FONT_FAMILY } from "./fonts";

export const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  accent: "#f97316",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#eab308",
  black: "#1a1a1a",
  darkGray: "#374151",
  gray: "#6b7280",
  lightGray: "#f3f4f6",
  border: "#e5e7eb",
  borderDark: "#d1d5db",
  white: "#ffffff",
};

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: colors.black,
    lineHeight: 1.5,
  },
  pageNoPadding: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    color: colors.black,
    lineHeight: 1.5,
  },
});
