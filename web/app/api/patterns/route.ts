import { NextResponse } from "next/server";
import { getLearnedPatterns } from "../../lib/pattern-learner";
import { TOTAL_STATIC_PATTERNS } from "../../lib/scanner";

export async function GET() {
  const patterns = await getLearnedPatterns();
  return NextResponse.json({
    base: TOTAL_STATIC_PATTERNS,
    learned: patterns.length,
    total: TOTAL_STATIC_PATTERNS + patterns.length,
    patterns: patterns.map((p) => ({
      pattern: p.pattern,
      category: p.category,
      severity: p.severity,
      description: p.description,
      learnedFrom: p.learnedFrom,
      learnedAt: p.learnedAt,
    })),
  });
}
