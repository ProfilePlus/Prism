#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const defaults = {
  repo: 'AlexPlum405/Prism',
  tag: `v${version}`,
  platform: 'darwin-aarch64',
  asset: 'Prism.app.tar.gz',
  bundleDir: path.join('src-tauri', 'target', 'release', 'bundle', 'macos'),
  output: path.join('src-tauri', 'target', 'release', 'bundle', 'macos', 'latest.json'),
  notes: `Prism ${version}`,
};

function parseArgs(argv) {
  const options = { ...defaults, check: false, pubDate: new Date().toISOString() };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') {
      options.check = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      throw new Error(`未知参数: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`参数 ${arg} 缺少值`);
    }
    index += 1;

    if (key === 'repo') options.repo = value;
    else if (key === 'tag') options.tag = value;
    else if (key === 'platform') options.platform = value;
    else if (key === 'asset') options.asset = value;
    else if (key === 'bundle-dir') options.bundleDir = value;
    else if (key === 'output') options.output = value;
    else if (key === 'notes') options.notes = value;
    else if (key === 'pub-date') options.pubDate = value;
    else throw new Error(`未知参数: ${arg}`);
  }

  return options;
}

function resolveFromRoot(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
}

function readSignature(signaturePath) {
  if (!existsSync(signaturePath)) {
    throw new Error(`缺少 updater 签名文件: ${signaturePath}`);
  }

  const signature = readFileSync(signaturePath, 'utf8').trim();
  if (!signature) {
    throw new Error(`updater 签名文件为空: ${signaturePath}`);
  }
  return signature;
}

function buildManifest(options) {
  const bundleDir = resolveFromRoot(options.bundleDir);
  const assetPath = path.join(bundleDir, options.asset);
  const signaturePath = `${assetPath}.sig`;

  if (!existsSync(assetPath)) {
    throw new Error(`缺少 updater bundle: ${assetPath}`);
  }

  const signature = readSignature(signaturePath);
  const url = `https://github.com/${options.repo}/releases/download/${options.tag}/${options.asset}`;

  return {
    version,
    notes: options.notes,
    pub_date: options.pubDate,
    platforms: {
      [options.platform]: {
        signature,
        url,
      },
    },
  };
}

function assertManifestShape(manifest, options) {
  const platform = manifest.platforms?.[options.platform];

  if (manifest.version !== version) {
    throw new Error(`manifest version 不匹配: ${manifest.version} != ${version}`);
  }
  if (!manifest.pub_date || Number.isNaN(Date.parse(manifest.pub_date))) {
    throw new Error('manifest pub_date 必须是有效 RFC 3339 / ISO 时间');
  }
  if (!platform?.url) {
    throw new Error(`manifest 缺少 platforms.${options.platform}.url`);
  }
  if (!platform?.signature) {
    throw new Error(`manifest 缺少 platforms.${options.platform}.signature`);
  }

  const expected = buildManifest({ ...options, pubDate: manifest.pub_date, notes: manifest.notes ?? '' });
  const expectedPlatform = expected.platforms[options.platform];
  if (platform.url !== expectedPlatform.url) {
    throw new Error(`manifest url 不匹配: ${platform.url} != ${expectedPlatform.url}`);
  }
  if (platform.signature !== expectedPlatform.signature) {
    throw new Error('manifest signature 与当前 .sig 文件不匹配');
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputPath = resolveFromRoot(options.output);

  if (options.check) {
    if (!existsSync(outputPath)) {
      throw new Error(`缺少 manifest: ${outputPath}`);
    }
    const manifest = JSON.parse(readFileSync(outputPath, 'utf8'));
    assertManifestShape(manifest, options);
    console.log(`OK: ${outputPath}`);
    return;
  }

  const manifest = buildManifest(options);
  assertManifestShape(manifest, options);
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
