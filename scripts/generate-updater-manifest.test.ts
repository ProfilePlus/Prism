import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve(process.cwd(), 'scripts/generate-updater-manifest.mjs');

async function createReleaseFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'prism-manifest-'));
  const bundleDir = path.join(root, 'src-tauri/target/release/bundle/macos');
  await mkdir(bundleDir, { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '9.8.7' }));
  await writeFile(path.join(bundleDir, 'Prism.app.tar.gz'), 'bundle');
  await writeFile(path.join(bundleDir, 'Prism.app.tar.gz.sig'), 'signature-v1\n');
  return { root, bundleDir };
}

describe('generate-updater-manifest', () => {
  it('writes and verifies a GitHub Release manifest from the updater signature', async () => {
    const fixture = await createReleaseFixture();
    try {
      await execFileAsync('node', [scriptPath], { cwd: fixture.root });

      const manifestPath = path.join(fixture.bundleDir, 'latest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

      expect(manifest).toMatchObject({
        version: '9.8.7',
        notes: 'Prism 9.8.7',
        platforms: {
          'darwin-aarch64': {
            signature: 'signature-v1',
            url: 'https://github.com/AlexPlum405/Prism/releases/download/v9.8.7/Prism.app.tar.gz',
          },
        },
      });
      expect(Date.parse(manifest.pub_date)).not.toBeNaN();

      await expect(execFileAsync('node', [scriptPath, '--check'], { cwd: fixture.root })).resolves.toBeDefined();
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('rejects a manifest whose signature no longer matches the updater asset signature', async () => {
    const fixture = await createReleaseFixture();
    try {
      await execFileAsync('node', [scriptPath], { cwd: fixture.root });
      await writeFile(path.join(fixture.bundleDir, 'Prism.app.tar.gz.sig'), 'signature-v2\n');

      await expect(execFileAsync('node', [scriptPath, '--check'], { cwd: fixture.root })).rejects.toThrow(
        'manifest signature 与当前 .sig 文件不匹配',
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});
