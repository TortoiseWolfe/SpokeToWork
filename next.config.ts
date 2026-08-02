import type { NextConfig } from 'next';
import { execSync } from 'child_process';

// Run project detection at build time
function detectProjectConfig() {
  try {
    // Run the detection script to generate config files
    execSync('node scripts/detect-project.js', { stdio: 'inherit' });
  } catch {
    console.warn('Could not run detection script');
  }

  // Use environment variable if set (from .env.local or CI/CD)
  if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }

  // Read the auto-detected configuration using require
  try {
    const fs = require('fs');

    const path = require('path');
    const configPath = path.join(
      __dirname,
      'src',
      'config',
      'project-detected.json'
    );
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.basePath || '';
  } catch {
    // Final fallback if detection completely fails
    console.warn('Could not read detected config, using empty base path');
    return '';
  }
}

const basePath = detectProjectConfig();

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  cleanDistDir: true,
  // Escape hatch for building alongside a running dev server (#93). The
  // `builder` compose service is the primary answer — it gets its own .next
  // volume — but this allows a one-off `NEXT_DIST_DIR=.next-build pnpm build`
  // without touching compose. `cleanDistDir` above cleans whichever dir this
  // resolves to, which is why the old `clean:next` script (a blind
  // `rm -rf .next/*`) was both redundant and unsafe.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: {
    NEXT_PUBLIC_PAGESPEED_API_KEY: process.env.NEXT_PUBLIC_PAGESPEED_API_KEY,
  },
  // NOTE: Custom webpack splitChunks was removed because it causes CSS files
  // to be incorrectly loaded as <script> tags in static export.
  // See: https://github.com/vercel/next.js/issues/66221
  // Next.js default chunk splitting is sufficient for most use cases.
};

export default nextConfig;
