import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set([
  '.git',
  'dist',
  'dist-electron',
  'node_modules',
  'playwright-report',
  'release',
  'test-results',
]);

const ignoredExtensions = new Set([
  '.dll',
  '.exe',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.node',
  '.pak',
  '.png',
  '.svg',
  '.ttf',
  '.webp',
  '.woff',
  '.woff2',
]);

const patterns = [
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  /ghp_[0-9A-Za-z]{36}/g,
  /sk-[A-Za-z0-9]{20,}/g,
];

const candidateFiles = [];

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await walk(fullPath);
      }
      continue;
    }

    if (ignoredExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    candidateFiles.push(fullPath);
  }
};

await walk(root);

const findings = [];

for (const filePath of candidateFiles) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const pattern of patterns) {
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        findings.push(`${filePath}:${index + 1}`);
      }
      pattern.lastIndex = 0;
    });
  }
}

if (findings.length > 0) {
  findings.forEach((finding) => {
    console.log(`Potential secret: ${finding}`);
  });
  process.exitCode = 1;
} else {
  console.log('No potential secrets detected.');
}
