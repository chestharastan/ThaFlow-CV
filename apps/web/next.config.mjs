/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static: the app has no server of its own, so there is nowhere for CV data to be stored remotely.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: [
    "@thaflow/ai-engine",
    "@thaflow/cv-core",
    "@thaflow/export-engine",
    "@thaflow/localization",
    "@thaflow/questionnaire",
    "@thaflow/rule-engine",
    "@thaflow/storage",
    "@thaflow/template-engine",
  ],
};

export default nextConfig;
