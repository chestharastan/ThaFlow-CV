import { common } from "./common";
import { landing } from "./landing";
import { create } from "./create";
import { gallery } from "./gallery";
import { editor } from "./editor";
import { settings } from "./settings";

/** English is the source catalog: its keys define MessageKey. One module per area of the UI. */
export const en = {
  ...common,
  ...landing,
  ...create,
  ...gallery,
  ...editor,
  ...settings,
} as const;
