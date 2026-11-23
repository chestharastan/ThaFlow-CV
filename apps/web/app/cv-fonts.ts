/**
 * Fonts used inside CV templates (not the app interface). They are bundled with
 * the app, so no font is ever requested from a third party, and they are
 * embedded when a CV is printed to PDF.
 *
 * Owned by the template engine: this list mirrors BUNDLED_FONTS in
 * @thaflow/template-engine (packages/template-engine/src/templates.ts), and a
 * unit test fails if the two drift apart. Add a family or weight there first.
 *
 * Latin families load their Latin subset. Khmer families load the per-weight
 * stylesheet, which carries the Khmer and Latin subsets with unicode-range, so
 * only the scripts a CV actually uses are downloaded.
 */

// Latin sans
import "@fontsource-variable/inter/wght.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";

// Latin mono
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";

// Latin serif
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-400-italic.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/source-serif-4/latin-700.css";
import "@fontsource/eb-garamond/latin-400.css";
import "@fontsource/eb-garamond/latin-400-italic.css";
import "@fontsource/eb-garamond/latin-500.css";
import "@fontsource/eb-garamond/latin-700.css";
import "@fontsource/lora/latin-400.css";
import "@fontsource/lora/latin-400-italic.css";
import "@fontsource/lora/latin-600.css";
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/playfair-display/latin-800.css";

// Khmer (each with its own Latin)
import "@fontsource/noto-sans-khmer/400.css";
import "@fontsource/noto-sans-khmer/700.css";
import "@fontsource/kantumruy-pro/400.css";
import "@fontsource/kantumruy-pro/600.css";
import "@fontsource/kantumruy-pro/700.css";
import "@fontsource/battambang/400.css";
import "@fontsource/battambang/700.css";
import "@fontsource/hanuman/400.css";
import "@fontsource/hanuman/700.css";
import "@fontsource/noto-serif-khmer/400.css";
import "@fontsource/noto-serif-khmer/700.css";
import "@fontsource/moul/400.css";
