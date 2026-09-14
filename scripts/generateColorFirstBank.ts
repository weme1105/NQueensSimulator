import { mkdir, writeFile } from 'node:fs/promises';
import { analyzeSolutionSearch, type SolverTelemetry } from '../src/solver/solutionTelemetry';
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
  telemetry: SolverTelemetry;
}

interface BankFile {
  version: 2;
  mode: 'basic-color-first';
  size: number;
  generatedAt: string;
  target: number;
  entries: BankEntry[];
  stats: {
    attempts: number;
    accepted: number;
    acceptanceRate: number;
    telemetry: {
      avgNodesVisited: number;
      avgCandidateChecks: number;
      avgDeadEnds: number;
      avgForcedNodes: number;
      avgMaxDepth: number;
      avgColumnBlocks: number;
      avgRegionBlocks: number;
      avgAdjacencyBlocks: number;
    };
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
      telemetry: analyzeSolutionSearch(result.board),
    });

    if (entries.length % 10 === 0 || entries.length === targetPerSize) {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[${size}x${size}] ${entries.length}/${targetPerSize} accepted, ${attempts} attempts, ${seconds}s`);
    }
  }

  const bank: BankFile = {
    version: 2,
    mode: 'basic-color-first',
    size,
    generatedAt: new Date().toISOString(),
    target: targetPerSize,
    entries,
    stats: {
      attempts,
      accepted: entries.length,
      acceptanceRate: attempts === 0 ? 0 : entries.length / attempts,
      telemetry: averageTelemetry(entries.map((entry) => entry.telemetry)),
    },
  };

  const output = `${outputDir}/puzzle-bank-${size}.json`;
  await writeFile(output, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');

  console.log(`[${size}x${size}] wrote ${output}: ${entries.length}/${targetPerSize}`);
}

function averageTelemetry(items: SolverTelemetry[]): BankFile['stats']['telemetry'] {
  if (!items.length) {
    return {
      avgNodesVisited: 0,
      avgCandidateChecks: 0,
      avgDeadEnds: 0,
      avgForcedNodes: 0,
      avgMaxDepth: 0,
      avgColumnBlocks: 0,
      avgRegionBlocks: 0,
      avgAdjacencyBlocks: 0,
    };
  }
  const sum = items.reduce(
    (acc, item) => ({
      nodesVisited: acc.nodesVisited + item.nodesVisited,
      candidateChecks: acc.candidateChecks + item.candidateChecks,
      deadEnds: acc.deadEnds + item.deadEnds,
      forcedNodes: acc.forcedNodes + item.forcedNodes,
      maxDepth: acc.maxDepth + item.maxDepth,
      columnBlocks: acc.columnBlocks + item.columnBlocks,
      regionBlocks: acc.regionBlocks + item.regionBlocks,
      adjacencyBlocks: acc.adjacencyBlocks + item.adjacencyBlocks,
    }),
    { nodesVisited: 0, candidateChecks: 0, deadEnds: 0, forcedNodes: 0, maxDepth: 0, columnBlocks: 0, regionBlocks: 0, adjacencyBlocks: 0 },
  );
  const avg = (value: number) => Number((value / items.length).toFixed(3));
  return {
    avgNodesVisited: avg(sum.nodesVisited),
    avgCandidateChecks: avg(sum.candidateChecks),
    avgDeadEnds: avg(sum.deadEnds),
    avgForcedNodes: avg(sum.forcedNodes),
    avgMaxDepth: avg(sum.maxDepth),
    avgColumnBlocks: avg(sum.columnBlocks),
    avgRegionBlocks: avg(sum.regionBlocks),
    avgAdjacencyBlocks: avg(sum.adjacencyBlocks),
  };
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
