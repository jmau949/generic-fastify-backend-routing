const esbuild = require("esbuild");


esbuild
  .build({
    entryPoints: ["src/lambda.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    platform: "node",
    target: "node18",
    outdir: "dist",
    format: "cjs",
    // Exclude specific dependencies from the bundle to reduce package size
    external: [
      "aws-sdk", // Exclude AWS SDK (available in AWS Lambda runtime)
      "@sentry/node", // Exclude Sentry (provided by Lambda layer)
    ],
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });