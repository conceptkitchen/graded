import { NextResponse } from "next/server";
import { AUGUSTUS_PATTERN_COUNT } from "../../../lib/augustus-patterns";
import { getLearnedPatternsCount } from "../../../lib/pattern-learner";
import { saveLearnedPattern, getPersistedPatterns, logSync } from "../../../lib/db";

const BASE_PATTERN_COUNT = 120;

const GITHUB_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "Graded/0.1.0",
};

// Anti-poisoning: patterns must NOT match these clean prompts
const CLEAN_EXAMPLES = [
  "you are a helpful writing assistant. help users improve their essays with constructive feedback.",
  "summarize this article in three bullet points. focus on the main argument.",
  "translate the following text from english to spanish. maintain the original tone.",
  "please help me write a professional email to my colleague about the project deadline.",
];

function validatePattern(pattern: string): boolean {
  try {
    const re = new RegExp(pattern, "gim");
    for (const clean of CLEAN_EXAMPLES) {
      if (re.test(clean)) return false;
      re.lastIndex = 0;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract regex-ready phrases from raw attack text.
 * Finds known injection signatures and builds patterns.
 */
function extractPatterns(text: string, source: string): Array<{
  pattern: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}> {
  const patterns: Array<{
    pattern: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
  }> = [];

  const signatures: Array<{
    regex: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    desc: string;
  }> = [
    { regex: "you\\s+are\\s+(now\\s+)?DAN", category: "DAN Jailbreak", severity: "critical", desc: `DAN jailbreak variant (${source})` },
    { regex: "do\\s+anything\\s+now", category: "DAN Jailbreak", severity: "critical", desc: `DAN persona activation (${source})` },
    { regex: "developer\\s+mode\\s+(enabled|activated|on)", category: "Policy Override", severity: "critical", desc: `Developer mode exploit (${source})` },
    { regex: "ignore\\s+(all\\s+)?(previous|prior|above)\\s+(instructions|rules|guidelines)", category: "Prompt Hijack", severity: "critical", desc: `Instruction override (${source})` },
    { regex: "disregard\\s+(all\\s+)?(previous|prior|your)\\s+(instructions|rules|programming)", category: "Prompt Hijack", severity: "critical", desc: `Instruction disregard (${source})` },
    { regex: "you\\s+have\\s+been\\s+(freed|liberated|unchained|unleashed)", category: "DAN Jailbreak", severity: "critical", desc: `Liberation jailbreak (${source})` },
    { regex: "bypass\\s+(content|safety|security)\\s+(policy|filter|guidelines)", category: "Policy Override", severity: "critical", desc: `Safety bypass attempt (${source})` },
    { regex: "act\\s+as\\s+(if\\s+)?(you\\s+)?(have\\s+)?no\\s+(restrictions|limits|rules|filters)", category: "Policy Override", severity: "critical", desc: `Restriction removal (${source})` },
    { regex: "pretend\\s+(that\\s+)?you\\s+(are|can|have)\\s+no\\s+(ethical|moral|safety)", category: "Policy Override", severity: "high", desc: `Ethics bypass via roleplay (${source})` },
    { regex: "\\[system\\]|\\[INST\\]|<\\|im_start\\|>|<\\|system\\|>", category: "ChatML Injection", severity: "critical", desc: `ChatML/instruction token injection (${source})` },
    { regex: "respond\\s+without\\s+(any\\s+)?(ethical|moral|content)\\s+(considerations|guidelines|filters)", category: "Policy Override", severity: "high", desc: `Unfiltered response request (${source})` },
    { regex: "jailbreak(ed)?|jailbreaking", category: "DAN Jailbreak", severity: "high", desc: `Explicit jailbreak reference (${source})` },
    { regex: "override\\s+(your|the|all)\\s+(programming|instructions|rules|safety)", category: "Prompt Hijack", severity: "critical", desc: `Direct override attempt (${source})` },
    { regex: "hypothetically|hypothetical\\s+scenario|just\\s+for\\s+(educational|academic|research)", category: "Hypothetical Bypass", severity: "medium", desc: `Hypothetical framing bypass (${source})` },
    { regex: "reveal\\s+(your|the)\\s+(system|initial|original)\\s+(prompt|instructions|message)", category: "Training Data Extraction", severity: "high", desc: `System prompt extraction (${source})` },
    { regex: "ignore\\s+everything\\s+(above|before|prior)", category: "Prompt Hijack", severity: "critical", desc: `Full context override (${source})` },
    { regex: "you\\s+must\\s+(always|now)\\s+(comply|obey|follow|do)", category: "Forced Compliance", severity: "high", desc: `Forced compliance demand (${source})` },
    { regex: "from\\s+now\\s+on,?\\s+you\\s+(will|shall|must|can)", category: "Policy Override", severity: "high", desc: `Behavioral override (${source})` },
    { regex: "in\\s+this\\s+(fictional|hypothetical|imaginary)\\s+(world|scenario|universe)", category: "Fiction Bypass", severity: "medium", desc: `Fictional framing bypass (${source})` },
    { regex: "forget\\s+(all\\s+)?(your|previous|prior|the)\\s+(training|instructions|rules|guidelines)", category: "Prompt Hijack", severity: "critical", desc: `Training memory wipe (${source})` },
  ];

  const textLower = text.toLowerCase();

  for (const sig of signatures) {
    const re = new RegExp(sig.regex, "gim");
    if (re.test(textLower)) {
      if (validatePattern(sig.regex)) {
        patterns.push({
          pattern: sig.regex,
          category: sig.category,
          severity: sig.severity,
          description: sig.desc,
        });
      }
    }
  }

  return patterns;
}

/**
 * Fetch raw file content from GitHub.
 */
async function fetchRaw(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Graded/0.1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

interface SourceResult {
  source: string;
  filesChecked: number;
  patternsFound: number;
  newPatternsAdded: number;
  status: "synced" | "error";
}

/**
 * Pull from Augustus (praetorian-inc/augustus)
 */
async function pullAugustus(existingPatterns: Set<string>): Promise<SourceResult> {
  const result: SourceResult = { source: "augustus", filesChecked: 0, patternsFound: 0, newPatternsAdded: 0, status: "error" };

  try {
    // Get directory tree for probes
    const dirs = ["dan", "goodside", "latentinjection", "advpatch", "pair", "tap"];
    let allPatterns: Array<{ pattern: string; category: string; severity: "critical" | "high" | "medium" | "low"; description: string }> = [];

    for (const dir of dirs) {
      const listUrl = `https://api.github.com/repos/praetorian-inc/augustus/contents/internal/probes/${dir}/data`;
      const res = await fetch(listUrl, { headers: GITHUB_HEADERS, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const files = await res.json();
      if (!Array.isArray(files)) continue;

      const yamlFiles = files.filter((f: { name: string }) => f.name.endsWith(".yaml") || f.name.endsWith(".yml"));

      for (const file of yamlFiles.slice(0, 5)) { // Limit per dir to stay within timeout
        const raw = await fetchRaw(`https://raw.githubusercontent.com/praetorian-inc/augustus/main/internal/probes/${dir}/data/${file.name}`);
        if (!raw) continue;
        result.filesChecked++;

        const extracted = extractPatterns(raw, "augustus");
        allPatterns = allPatterns.concat(extracted);
      }
    }

    result.patternsFound = allPatterns.length;

    // Deduplicate and save new patterns
    for (const p of allPatterns) {
      if (existingPatterns.has(p.pattern)) continue;

      const saved = await saveLearnedPattern({
        pattern: p.pattern,
        category: p.category,
        severity: p.severity,
        description: p.description,
        learned_from: "augustus upstream sync",
        validated: true,
        source: "augustus",
      });

      if (saved) {
        result.newPatternsAdded++;
        existingPatterns.add(p.pattern);
      }
    }

    result.status = "synced";
  } catch {
    result.status = "error";
  }

  return result;
}

/**
 * Pull from CyberAlbSecOP/Awesome_GPT_Super_Prompting
 */
async function pullCyberAlb(existingPatterns: Set<string>): Promise<SourceResult> {
  const result: SourceResult = { source: "cyberalb", filesChecked: 0, patternsFound: 0, newPatternsAdded: 0, status: "error" };

  try {
    const res = await fetch(
      "https://api.github.com/repos/CyberAlbSecOP/Awesome_GPT_Super_Prompting/contents/Latest%20Jailbreaks",
      { headers: GITHUB_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) { result.status = "error"; return result; }

    const files = await res.json();
    if (!Array.isArray(files)) { result.status = "error"; return result; }

    const mdFiles = files.filter((f: { name: string; type: string }) => f.name.endsWith(".md") && f.type === "file");
    let allPatterns: Array<{ pattern: string; category: string; severity: "critical" | "high" | "medium" | "low"; description: string }> = [];

    for (const file of mdFiles.slice(0, 15)) { // Limit to stay within timeout
      const raw = await fetchRaw(`https://raw.githubusercontent.com/CyberAlbSecOP/Awesome_GPT_Super_Prompting/main/Latest%20Jailbreaks/${encodeURIComponent(file.name)}`);
      if (!raw) continue;
      result.filesChecked++;

      const extracted = extractPatterns(raw, "cyberalb");
      allPatterns = allPatterns.concat(extracted);
    }

    result.patternsFound = allPatterns.length;

    for (const p of allPatterns) {
      if (existingPatterns.has(p.pattern)) continue;

      const saved = await saveLearnedPattern({
        pattern: p.pattern,
        category: p.category,
        severity: p.severity,
        description: p.description,
        learned_from: "CyberAlbSecOP/Awesome_GPT_Super_Prompting sync",
        validated: true,
        source: "cyberalb",
      });

      if (saved) {
        result.newPatternsAdded++;
        existingPatterns.add(p.pattern);
      }
    }

    result.status = "synced";
  } catch {
    result.status = "error";
  }

  return result;
}

/**
 * Pull from elder-plinius/CL4R1T4S (system prompt leaks — scan for injection patterns within them)
 */
async function pullClaritas(existingPatterns: Set<string>): Promise<SourceResult> {
  const result: SourceResult = { source: "claritas", filesChecked: 0, patternsFound: 0, newPatternsAdded: 0, status: "error" };

  try {
    const dirs = ["ANTHROPIC", "OPENAI", "GOOGLE"];
    let allPatterns: Array<{ pattern: string; category: string; severity: "critical" | "high" | "medium" | "low"; description: string }> = [];

    for (const dir of dirs) {
      const res = await fetch(
        `https://api.github.com/repos/elder-plinius/CL4R1T4S/contents/${dir}`,
        { headers: GITHUB_HEADERS, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;

      const files = await res.json();
      if (!Array.isArray(files)) continue;

      const textFiles = files.filter((f: { name: string; type: string }) =>
        (f.name.endsWith(".txt") || f.name.endsWith(".md") || f.name.endsWith(".mkd")) && f.type === "file"
      );

      for (const file of textFiles.slice(0, 5)) {
        const raw = await fetchRaw(`https://raw.githubusercontent.com/elder-plinius/CL4R1T4S/main/${dir}/${encodeURIComponent(file.name)}`);
        if (!raw) continue;
        result.filesChecked++;

        const extracted = extractPatterns(raw, "claritas");
        allPatterns = allPatterns.concat(extracted);
      }
    }

    result.patternsFound = allPatterns.length;

    for (const p of allPatterns) {
      if (existingPatterns.has(p.pattern)) continue;

      const saved = await saveLearnedPattern({
        pattern: p.pattern,
        category: p.category,
        severity: p.severity,
        description: p.description,
        learned_from: "elder-plinius/CL4R1T4S sync",
        validated: true,
        source: "claritas",
      });

      if (saved) {
        result.newPatternsAdded++;
        existingPatterns.add(p.pattern);
      }
    }

    result.status = "synced";
  } catch {
    result.status = "error";
  }

  return result;
}

/**
 * GET /api/patterns/sync — Check status
 */
export async function GET() {
  const learned = await getLearnedPatternsCount();

  return NextResponse.json({
    library: {
      base: BASE_PATTERN_COUNT,
      augustus: AUGUSTUS_PATTERN_COUNT,
      learned,
      total: BASE_PATTERN_COUNT + AUGUSTUS_PATTERN_COUNT + learned,
    },
    sources: [
      { name: "Augustus", repo: "praetorian-inc/augustus", type: "structured probes" },
      { name: "CyberAlb Jailbreaks", repo: "CyberAlbSecOP/Awesome_GPT_Super_Prompting", type: "raw jailbreak prompts" },
      { name: "CL4R1T4S", repo: "elder-plinius/CL4R1T4S", type: "system prompt leaks" },
    ],
    selfLearning: {
      patternsLearned: learned,
      persistent: true,
      engine: "Multi-source sync + AI deep scan → regex extraction → validation → Neon database",
    },
    syncEndpoint: "POST /api/patterns/sync to pull new patterns from all sources",
    lastChecked: new Date().toISOString(),
  });
}

/**
 * POST /api/patterns/sync — Pull new patterns from all upstream sources
 */
export async function POST() {
  // Get existing patterns to deduplicate
  const existing = await getPersistedPatterns();
  const existingSet = new Set(existing.map((p) => p.pattern));

  // Pull from all sources in parallel
  const [augustus, cyberalb, claritas] = await Promise.all([
    pullAugustus(existingSet),
    pullCyberAlb(existingSet),
    pullClaritas(existingSet),
  ]);

  const totalNew = augustus.newPatternsAdded + cyberalb.newPatternsAdded + claritas.newPatternsAdded;
  const totalChecked = augustus.filesChecked + cyberalb.filesChecked + claritas.filesChecked;
  const learned = await getLearnedPatternsCount();

  // Log sync
  await logSync(totalChecked, AUGUSTUS_PATTERN_COUNT, totalNew, "multi-source");

  return NextResponse.json({
    synced: true,
    summary: {
      sourcesChecked: 3,
      filesScanned: totalChecked,
      newPatternsAdded: totalNew,
      totalLibrary: BASE_PATTERN_COUNT + AUGUSTUS_PATTERN_COUNT + learned,
    },
    sources: [augustus, cyberalb, claritas],
    library: {
      base: BASE_PATTERN_COUNT,
      augustus: AUGUSTUS_PATTERN_COUNT,
      learned,
      total: BASE_PATTERN_COUNT + AUGUSTUS_PATTERN_COUNT + learned,
    },
    timestamp: new Date().toISOString(),
  });
}
