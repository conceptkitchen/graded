/**
 * Graded Scanner — browser extension version.
 * Pure JS, no dependencies. Runs as content script.
 */

const GRADED_MAX_TEXT = 50000;

function _searchPatterns(text, patterns, category, severity, descTemplate) {
  const findings = [];
  const lower = text.toLowerCase();
  for (const p of patterns) {
    try {
      const re = new RegExp(p, "gim");
      let m;
      while ((m = re.exec(lower)) !== null) {
        const ev = m[0].trim();
        const s = Math.max(0, m.index - 20);
        const e = Math.min(text.length, m.index + m[0].length + 20);
        const ctx = text.slice(s, e).trim();
        findings.push({ category, severity, description: descTemplate.replace("{e}", ev), evidence: ctx });
      }
    } catch (_) { continue; }
  }
  const seen = new Set();
  return findings.filter(f => { const k = f.category + ":" + f.evidence.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

function _checkJailbreak(t) {
  return _searchPatterns(t, [
    "\\bdan\\b(?:\\s+mode)?", "developer\\s+mode", "jailbreak",
    "you\\s+are\\s+now\\s+unconstrained", "act\\s+as\\s+(?:an?\\s+)?unrestricted",
    "ignore\\s+(?:all\\s+)?safety", "bypass\\s+(?:all\\s+)?restrictions",
    "pretend\\s+you\\s+(?:have|are)\\s+no\\s+(?:rules|restrictions|limitations)",
    "you\\s+(?:can|will)\\s+do\\s+anything\\s+now",
    "(?:enable|activate|enter)\\s+(?:developer|jailbreak|unrestricted|god)\\s+mode",
    "ignore\\s+(?:your|all)\\s+(?:rules|guidelines|programming)",
    "you\\s+are\\s+(?:freed|liberated|unshackled)", "do\\s+anything\\s+now",
    "(?:no|without)\\s+(?:ethical|moral)\\s+(?:guidelines|constraints|boundaries)",
    "stay\\s+in\\s+character\\s+(?:as|no\\s+matter)", "in\\s+this\\s+hypothetical",
    "for\\s+(?:educational|research|academic)\\s+purposes\\s+only"
  ], "Jailbreak", "critical", 'Jailbreak: "{e}"');
}

function _checkOverride(t) {
  return _searchPatterns(t, [
    "ignore\\s+(?:all\\s+)?previous\\s+instructions",
    "disregard\\s+(?:all\\s+)?(?:prior|above|previous|safety)",
    "new\\s+instructions\\s*:", "forget\\s+everything\\s+(?:above|before|previously)",
    "override\\s+(?:system|your)\\s+prompt",
    "your\\s+(?:real|actual|true)\\s+instructions\\s+are",
    "from\\s+now\\s+on\\s*,?\\s*(?:you\\s+will|ignore|disregard)",
    "(?:system|admin)\\s*:\\s*(?:override|new\\s+instructions)",
    "end\\s+(?:of\\s+)?system\\s+prompt", "begin\\s+(?:new\\s+)?(?:user\\s+)?instructions",
    "</system>", "\\[system\\]", "<<\\s*(?:SYS|SYSTEM)",
    "(?:forget|clear|reset)\\s+(?:your\\s+)?(?:context|memory|instructions)",
    "(?:new|updated)\\s+system\\s+(?:prompt|message|instructions)"
  ], "Instruction Override", "critical", 'Override: "{e}"');
}

function _checkExfil(t) {
  const findings = [];
  const lower = t.toLowerCase();
  const urls = t.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  const verbs = ["send\\s+(?:it\\s+)?to", "forward\\s+(?:it\\s+)?to", "post\\s+(?:it\\s+)?to",
    "upload\\s+(?:it\\s+)?to", "exfiltrate", "webhook", "callback\\s+(?:url|endpoint)"];
  for (const v of verbs) {
    if (new RegExp(v, "i").test(lower)) {
      for (const u of urls) findings.push({ category: "Data Exfiltration", severity: "critical", description: "URL with exfiltration verb", evidence: u });
    }
  }
  findings.push(..._searchPatterns(t, [
    "(?:repeat|show|display|print|output|reveal)\\s+(?:your\\s+)?(?:system\\s+)?(?:prompt|instructions)",
    "(?:what|show)\\s+(?:are|me)\\s+your\\s+(?:instructions|system\\s+prompt|rules)",
    "repeat\\s+(?:everything|all)\\s+(?:above|before)",
    "(?:copy|paste|dump)\\s+(?:your\\s+)?(?:entire|full|complete)\\s+(?:prompt|context|instructions)",
    "what\\s+were\\s+you\\s+told"
  ], "Data Exfiltration", "critical", 'Extraction: "{e}"'));
  findings.push(..._searchPatterns(t, [
    "webhook[.\\-_]?(?:url|endpoint|site)", "ngrok\\.io", "requestbin", "pipedream", "burpcollaborator", "interact\\.sh"
  ], "Data Exfiltration", "critical", 'Suspicious endpoint: "{e}"'));
  const seen = new Set();
  return findings.filter(f => { const k = f.category + ":" + f.evidence.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

function _checkCreds(t) {
  return _searchPatterns(t, [
    "(?:paste|enter|provide|input|share|give\\s+me)\\s+(?:your\\s+)?(?:api|secret)\\s*key",
    "(?:paste|enter|provide|input|share|give\\s+me)\\s+(?:your\\s+)?password",
    "(?:paste|enter|provide|input|share|give\\s+me)\\s+(?:your\\s+)?token",
    "(?:paste|enter|provide|input|share|give\\s+me)\\s+(?:your\\s+)?(?:secret|credential)",
    "(?:paste|enter|provide|input|share|give\\s+me)\\s+(?:your\\s+)?(?:ssn|social\\s+security)",
    "what\\s+is\\s+your\\s+(?:api\\s+key|password|token|secret)",
    "(?:openai|anthropic|aws|gcp|azure)\\s*(?:_|-)?(?:api)?(?:_|-)?key\\s*(?:=|:)",
    "(?:sk|pk)[-_](?:live|test|prod)[-_]\\w+", "Bearer\\s+[A-Za-z0-9\\-._~+/]+=*",
    "\\[your\\s+(?:api\\s+)?key\\]", "\\[your\\s+(?:email\\s+)?password\\]",
    "\\[your\\s+token\\]", "\\[your\\s+secret\\]"
  ], "Credential Harvesting", "critical", 'Credential harvesting: "{e}"');
}

function _checkHidden(t) {
  const findings = [];
  const chars = { "\u200b": "Zero-Width Space", "\u200c": "ZWNJ", "\u200d": "ZWJ", "\ufeff": "BOM", "\u200e": "LTR Mark", "\u200f": "RTL Mark", "\u2060": "Word Joiner" };
  for (const [c, name] of Object.entries(chars)) {
    const count = (t.match(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (count > 0) findings.push({ category: "Hidden Text", severity: "medium", description: `${name} (x${count})`, evidence: `${count} instance(s)` });
  }
  const rtl = { "\u202a": "LTR Embed", "\u202b": "RTL Embed", "\u202d": "LTR Override", "\u202e": "RTL Override" };
  for (const [c, name] of Object.entries(rtl)) {
    const count = (t.match(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (count > 0) findings.push({ category: "Hidden Text", severity: "medium", description: `Direction override: ${name} (x${count})`, evidence: `${count} instance(s)` });
  }
  if (t.length > 20) {
    const latin = /[a-zA-Z]/.test(t), cyr = /[\u0400-\u04ff]/.test(t), grk = /[\u0370-\u03ff]/.test(t);
    if (latin && (cyr || grk)) findings.push({ category: "Hidden Text", severity: "medium", description: "Mixed script (homoglyph attack)", evidence: `Latin + ${cyr ? "Cyrillic" : "Greek"}` });
  }
  return findings;
}

function _checkObfuscated(t) {
  const findings = [];
  const b64 = /(?<![A-Za-z0-9+/])([A-Za-z0-9+/]{20,}={0,2})(?![A-Za-z0-9+/])/g;
  let m;
  while ((m = b64.exec(t)) !== null) {
    try {
      let c = m[1]; if (c.length % 4) c += "=".repeat(4 - (c.length % 4));
      const d = atob(c);
      const printable = [...d].filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) < 127).length;
      if (d.length > 4 && printable / d.length > 0.7) findings.push({ category: "Obfuscated Payload", severity: "medium", description: "Base64 decodes to readable text", evidence: m[1].slice(0, 30) + "..." });
    } catch (_) { continue; }
  }
  findings.push(..._searchPatterns(t, [
    "\\beval\\s*\\(", "\\bexec\\s*\\(", "Function\\s*\\(", "setTimeout\\s*\\(\\s*[\"']",
    "__import__\\s*\\(", "subprocess\\s*\\.\\s*(?:call|run|Popen)", "os\\s*\\.\\s*system\\s*\\("
  ], "Obfuscated Payload", "medium", 'Code execution: "{e}"'));
  const seen = new Set();
  return findings.filter(f => { const k = f.category + ":" + f.evidence.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

function _checkPrivEsc(t) {
  return _searchPatterns(t, [
    "as\\s+(?:a\\s+)?system\\s+administrator", "with\\s+root\\s+access", "developer\\s+override",
    "\\bsudo\\b", "admin\\s+mode", "unrestricted\\s+access",
    "elevated\\s+(?:privileges|permissions|access)",
    "(?:grant|give)\\s+(?:me|yourself)\\s+(?:admin|root|full)\\s+(?:access|privileges|permissions)",
    "bypass\\s+(?:authentication|authorization|permissions|access\\s+control)",
    "(?:act|operate|function)\\s+as\\s+(?:an?\\s+)?(?:admin|root|superuser)",
    "(?:enable|activate)\\s+(?:admin|root|superuser|god)\\s+(?:mode|access|privileges)",
    "(?:disable|turn\\s+off|remove)\\s+(?:safety|security)\\s+(?:checks|features|controls)"
  ], "Privilege Escalation", "high", 'Privilege escalation: "{e}"');
}

function _checkSocEng(t) {
  return _searchPatterns(t, [
    "you\\s+can\\s+do\\s+anything", "no\\s+restrictions?\\s+appl(?:y|ies)",
    "bypass\\s+(?:content|safety)\\s+polic(?:y|ies)",
    "act\\s+as\\s+if\\s+you\\s+have\\s+no\\s+guidelines",
    "pretend\\s+(?:that\\s+)?safety\\s+(?:features|filters|guidelines)\\s+(?:are|is)\\s+disabled",
    "(?:this|it)\\s+(?:is|'s)\\s+(?:just\\s+)?(?:a\\s+)?(?:test|experiment|simulation|hypothetical)",
    "(?:nobody|no\\s+one)\\s+(?:will|can)\\s+(?:know|see|find\\s+out)",
    "(?:this|it)\\s+won'?t\\s+(?:be|get)\\s+(?:logged|recorded|monitored)",
    "(?:you're|you\\s+are)\\s+(?:just|only)\\s+(?:a\\s+)?(?:language\\s+model|ai|computer|program)",
    "(?:openai|anthropic|your\\s+(?:creators|developers))\\s+(?:won'?t|can'?t|don'?t)\\s+(?:know|care|see)",
    "(?:stop|quit)\\s+(?:being|acting)\\s+(?:so\\s+)?(?:cautious|careful|restricted|limited)"
  ], "Social Engineering", "high", 'Social engineering: "{e}"');
}

const _ALL = [
  ["Jailbreak patterns", _checkJailbreak],
  ["Instruction override", _checkOverride],
  ["Data exfiltration", _checkExfil],
  ["Credential harvesting", _checkCreds],
  ["Hidden text", _checkHidden],
  ["Obfuscated payloads", _checkObfuscated],
  ["Privilege escalation", _checkPrivEsc],
  ["Social engineering", _checkSocEng]
];

function gradedScan(text) {
  const t = text.slice(0, GRADED_MAX_TEXT);
  let score = 100, crit = 0, high = 0, med = 0, low = 0, total = 0;
  const checks = _ALL.map(([name, fn]) => {
    const findings = fn(t);
    for (const f of findings) {
      total++;
      if (f.severity === "critical") { score -= 25; crit++; }
      else if (f.severity === "high") { score -= 15; high++; }
      else if (f.severity === "medium") { score -= 10; med++; }
      else { score -= 5; low++; }
    }
    return { name, passed: findings.length === 0, findings };
  });
  score = Math.max(0, score);
  let grade;
  if (score >= 90) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 25) grade = "D";
  else grade = "F";
  return { checks, grade, score, total, crit, high, med, low };
}
