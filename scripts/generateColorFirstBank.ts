import { mkdir, writeFile } from 'node:fs/promises';
import { generateColorFirstPuzzle } from '../src/solver/colorFirstGenerator';

const sizes = parseSizes(process.env.SIZES ?? '6,7,8,9,10');
const targetPerSize = positiveInt(process.env.TARGET_PER_SIZE, 50);
const maxAttemptsPerSize = positiveInt(process.env.MAX_ATTEMPTS, 200_000);
const outputDir = process.env.OUTPUT_DIR ?? 'data/generated/basic';

interface BankEntry {
  id: string;
  size: number;
  regions: number[];
  solution: number[];
}

interface BankFile {
  version: 1;
  mode: 'basic-color-first';
  size: number;
  generatedAt: string;
  target: number;
  entries: BankEntry[];
  stats: {
    attempts: number;
    accepted: number;
    acceptanceRate: number;
  };
}

await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  const entries: BankEntry[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  const started = Date.now();

  while (entries.length < targetPerSize && attempts < maxAttemptsPerSize) {
    attempts++;
    const result = generateColorFirstPuzzle(size, { maxAttempts: 1 });
    if (!result) continue;

    const regions = result.board.cells.map((cell) => cell.regionId);
    const signature = regions.join(',');
    if (seen.has(signature)) continue;
    seen.add(signature);

    entries.push({
      id: `${size}x${size}-${String(entries.length + 1).padStart(4, '0')}`,
      size,
      regions,
      solution: result.solution,
    });

    if (entries.length % 10 === 0 || entries.length === targetPerSize) {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[${size}x${size}] ${entries.length}/${targetPerSize} accepted, ${attempts} attempts, ${seconds}s`);
    }
  }

  const bank: BankFile = {
    version: 1,
    mode: 'basic-color-first',
    size,
    generatedAt: new Date().toISOString(),
    target: targetPerSize,
    entries,
    stats: {
      attempts,
      accepted: entries.length,
      acceptanceRate: attempts === 0 ? 0 : entries.length / attempts,
    },
  };

  const output = `${outputDir}/puzzle-bank-${size}.json`;
  await writeFile(output, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');

  console.log(`[${size}x${size}] wrote ${output}: ${entries.length}/${targetPerSize}`);
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseSizes(value: string): number[] {
  const parsed = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((size) => Number.isInteger(size) && size >= 4 && size <= 12);
  return [...new Set(parsed.length ? parsed : [6, 7, 8, 9, 10])];
}
