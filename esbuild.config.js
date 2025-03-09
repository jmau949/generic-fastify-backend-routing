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
    external: ["aws-sdk"],
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
