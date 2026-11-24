import { common } from "./common";
import { landing } from "./landing";
import { create } from "./create";
import { gallery } from "./gallery";
import { editor } from "./editor";
import { settings } from "./settings";
import { home } from "./home";
import { dashboard } from "./dashboard";

/** Khmer catalog. Missing keys fall back to English at runtime. */
export const km = {
  ...common,
  ...landing,
  ...create,
  ...gallery,
  ...editor,
  ...settings,
  ...home,
  ...dashboard,
};
