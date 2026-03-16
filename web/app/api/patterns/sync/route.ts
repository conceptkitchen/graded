import { NextResponse } from "next/server";
import { AUGUSTUS_PATTERN_COUNT } from "../../../lib/augustus-patterns";
import { getLearnedPatternsCount } from "../../../lib/pattern-learner";
import { logSync } from "../../../lib/db";

const BASE_PATTERN_COUNT = 120;

/**
 * GET /api/patterns/sync
 * Checks the upstream Augustus repo for new patterns and returns
 * current library status + any delta. Logs sync to database.
 */
export async function GET() {
  let upstreamCount: number | null = null;
  let upstreamStatus: "synced" | "new_available" | "check_failed" = "check_failed";
  let newUpstream = 0;

  try {
    // Augustus corpus is a directory of YAML files — fetch the directory listing via GitHub API
    const res = await fetch(
      "https://api.github.com/repos/praetorian-inc/augustus/contents/corpus",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Graded/0.1.0",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.ok) {
      const files = await res.json();
      if (Array.isArray(files)) {
        // Count YAML files in the corpus directory
        upstreamCount = files.filter(
          (f: { name: string }) =>
            f.name.endsWith(".yaml") || f.name.endsWith(".yml")
        ).length;
        newUpstream = Math.max(0, upstreamCount - AUGUSTUS_PATTERN_COUNT);
        upstreamStatus = newUpstream > 0 ? "new_available" : "synced";
      }
    }
  } catch {
    upstreamStatus = "check_failed";
  }

  const learned = await getLearnedPatternsCount();

  // Log sync to database
  if (upstreamCount !== null) {
    await logSync(upstreamCount, AUGUSTUS_PATTERN_COUNT, newUpstream);
  }

  return NextResponse.json({
    library: {
      base: BASE_PATTERN_COUNT,
      augustus: AUGUSTUS_PATTERN_COUNT,
      learned,
      total: BASE_PATTERN_COUNT + AUGUSTUS_PATTERN_COUNT + learned,
    },
    upstream: {
      status: upstreamStatus,
      augustusRepo: "praetorian-inc/augustus",
      upstreamPatterns: upstreamCount,
      localAugustus: AUGUSTUS_PATTERN_COUNT,
      newAvailable: newUpstream,
    },
    selfLearning: {
      patternsLearned: learned,
      persistent: true,
      engine: "AI deep scan → regex extraction → validation → Neon database",
    },
    lastChecked: new Date().toISOString(),
  });
}
