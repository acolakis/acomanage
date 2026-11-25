import { Font } from "@react-pdf/renderer";
import path from "path";

const fontsDir = path.join(process.cwd(), "src/assets/fonts");

Font.register({
  family: "NunitoSans",
  fonts: [
    { src: path.join(fontsDir, "NunitoSans-Regular.ttf") },
    { src: path.join(fontsDir, "NunitoSans-Bold.ttf"), fontWeight: 700 },
    { src: path.join(fontsDir, "NunitoSans-Italic.ttf"), fontStyle: "italic" },
    {
      src: path.join(fontsDir, "NunitoSans-BoldItalic.ttf"),
      fontWeight: 700,
      fontStyle: "italic",
    },
  ],
});

export const FONT_FAMILY = "NunitoSans";
