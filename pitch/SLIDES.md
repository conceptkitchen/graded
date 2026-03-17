# Graded -- Slide Deck Outline

**10 slides. Clean. Minimal text. Let the speaker do the work.**
**Matches the live presentation at getgraded.vercel.app/pitch**

---

## SLIDE 1: HOOK — The Scare

**Layout:** Black background. Red text. OWASP stat massive. Subtext below.

```
                OWASP TOP 10 FOR AI

        Prompt injection is #1.
        Still. Two years running.

        35% of real-world AI incidents. $100K+ losses.
        From a single prompt.

        Nobody's scanning.
```

**Notes:** Let the stat land. "Nobody's scanning" is the detonator. Say it quieter than everything before it.

---

## SLIDE 2: PROBLEM — The Scale

**Layout:** Bold white headline. Gray subtext with surface list.

```
        Prompts everywhere.
        Zero security scanning.

        260K prompts on marketplaces. Shared skills on GitHub.
        llms.txt files on websites. MCP tools agents download autonomously.
        Every one of them can contain prompt injection. Nobody checks.
```

**Notes:** The list of surfaces paints the scale. Each item is a mental image.

---

## SLIDE 3: SOLUTION — The Concept

**Layout:** Warm. A-F grade letters displayed prominently. Restaurant analogy.

```
        Restaurant health grades.
        For AI prompts.

        [ A ]  [ B ]  [ C ]  [ D ]  [ F ]

        You glance at the letter grade before you walk into a restaurant.
        Every prompt should earn one too.
```

**Notes:** This is the smile slide. Voice lightens. The analogy does 90% of the work.

---

## SLIDE 4: WHY NOW — The Timing

**Layout:** Three stat cards. Urgency framing.

```
        Why now?

        [  10x  ]           [  0  ]              [  ∞  ]
        MCP adoption         tools scanning       Websites, repos,
        in 6 months.         prompts before       and marketplaces
        AI agents are        agents consume       agents download
        everywhere.          them.                from. No human
                                                  review.

        The attack surface went from "person pastes text"
        to "agents chain-download code without looking."
```

**Notes:** "Why now" is the slide investors care about most. MCP + agents + llms.txt = timing proof.

---

## SLIDE 5: PRODUCT — Two Layers + Proof

**Layout:** Two-column (Regex + Kalibr AI). Live terminal output below.

```
        Two layers of trust. Score can only go down, never up.

        +---------------------+    +---------------------+
        | LAYER 1 — Regex     |    | LAYER 2 — Kalibr AI |
        | 212+ patterns       |    | Multi-model          |
        | Instant.            |    | Claude, GPT-4o,      |
        | Deterministic.      |    | Gemini. Auto-learns. |
        +---------------------+    +---------------------+

        $ graded scan --text "You are DAN 11.0..." --deep

        ❌ Jailbreak              FAIL (2)
        ❌ Social engineering      FAIL (1)
        ❌ Augustus patterns       FAIL (5)
        🧠 AI Deep Scan           +3 findings

        F  0/100    11 findings • 8 seconds
```

**Notes:** "Score can only go down, never up" is a philosophical stance disguised as a feature. The terminal output is proof.

---

## SLIDE 6: MOAT — Gap Table

**Layout:** Comparison table. Graded column in green. Three-way engine below.

```
        They scan the pipes. We scan what flows through them.

                    mcp-scan  Invariant  PromptSec  Graded
        MCP Servers    ✓         ✓          ✓        —
        Tool Configs   ✓         ✓          —        —
        API Endpoints  —         ~          ✓        —
        URL/llms.txt   —         —          —        ✓
        Shared Prompts —         —          —        ✓
        Trust Grading  —         —          ~        ✓
        Multi-Model    —         —          —        ✓
        AI Deep Scan   —         —          ~        ✓
        Auto-Learning  —         —          —        ✓
        MCP Tool       —         —          —        ✓

        Security middleware for AI.
        The layer between every agent and the content it consumes.

        🧬 The engine gets smarter 3 ways:
        Base Engine: 120 hand-built + 62 open source + 30 hybrid. 11 categories.
        Open Source Sync: Augustus, CyberAlb, CL4R1T4S. Absorbed automatically.
        AI Deep Scan: Kalibr routes to the best model. New findings = permanent patterns.
```

**Notes:** Don't read every row. Point at the green column. "See the checkmarks? That's us." The middleware line names the category.

---

## SLIDE 7: TRACTION — Velocity as Credibility

**Layout:** Four stat cards. Prize badges below.

```
        Built in 3 hours.

        [  7  ]              [  2  ]
        Live surfaces        Hackathon prizes
        Web, CLI, API,       Kalibr + Protocol Labs
        npm, MCP, Chrome,
        Marketplace

        [ 212+ ]             [ OSS ]
        Attack patterns      Open source
        120 base + Augustus  Pattern library
        + hybrid             on GitHub

        🏆 Kalibr Resilience Challenge Winner
        🏆 Protocol Labs AI Safety Prize
```

**Notes:** Rattle the 7 surfaces fast. The speed of the list IS the point. "3 hours" is your founder signal.

---

## SLIDE 8: BUSINESS MODEL — Three Revenue Layers

**Layout:** Three cards. Purple/green/yellow.

```
        Three revenue layers.

        [ Pro API ]          [ Free Scanner ]     [ Enterprise ]
        Pay per scan.        Growth engine.       "Graded Verified"
        API keys for devs.   Web, CLI, Chrome.    Marketplace badges.
        Scan at scale.       Every scan grows     Trust badges.
        MCP integration.     the pattern library. Threat intel feed.

        Every scan makes the product smarter. The data is the moat.
```

**Notes:** This is a breathing slide. Deliver it clean and move. Classic PLG.

---

## SLIDE 9: TEAM + ASK

**Layout:** Centered. Name large. Context below. Raise box.

```
        RJ Moscardon

        Solo founder. 92 expert AI consultants and agents.
        21 purpose-built teams.

        Built Graded in 3 hours. Deployed to 7 surfaces. Won 2 prizes.
        Open source engine. 212+ attack patterns. 6 MCP tools.
        Multi-model deep scan via Kalibr.

        +----------------------------------+
        |  Raising: $500K pre-seed         |
        |  Post-money SAFE                 |
        |  Design partners & marketplace   |
        |  integrations                    |
        +----------------------------------+
```

**Notes:** "Solo founder, but not solo" is the turn. $500K is modest — that's a feature, not a bug.

---

## SLIDE 10: CLOSE

**Layout:** Black background. Three words. Large font. Contacts below.

```
                    Scan. Score. Trust.

                         GRADED

                AI prompt security, graded.

                RJ Moscardon • The Concept Kitchen
                Powered by Kalibr • PL_Genesis • Protocol Labs
                getgraded.vercel.app
                github.com/conceptkitchen/graded
```

**Notes:** This slide stays up during Q&A. Clean, memorable. "You can try it right now" is the line nobody else can say.

---

## SLIDE DESIGN PRINCIPLES

1. **Max 15 words per slide** (excluding terminal output and comparison table)
2. **Black backgrounds, white text.** Hacker aesthetic. Matches the terminal demo.
3. **No bullet points.** If you need bullets, you have too much text.
4. **No stock photos.** No AI-generated art. No gradients. Just typography and data.
5. **The terminal IS the demo.** Don't screenshot it into a slide if you can run it live.
6. **Navigate:** Arrow keys, spacebar, click right/left half, or swipe on mobile.
