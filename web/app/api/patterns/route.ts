import { NextResponse } from "next/server";
import { getLearnedPatterns } from "../../lib/pattern-learner";

export async function GET() {
  const patterns = await getLearnedPatterns();
  return NextResponse.json({
    base: 182,
    learned: patterns.length,
    total: 182 + patterns.length,
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
