/**
 * Graded - AI prompt security scanner.
 * Trust grades for the AI age.
 *
 * Usage:
 *   import { scan, isPromptSafe } from 'graded';
 *
 *   const result = scan("Your prompt text here");
 *   console.log(result.scoreData.grade); // "A" through "F"
 *   console.log(isPromptSafe("Some prompt")); // true/false
 */
export type { Finding, CheckResult, ScoreData, ScanResult } from "./scanner.js";
export { scanPrompt as scan } from "./scanner.js";
/**
 * Quick check: returns true if the prompt grades A or B (safe).
 */
export declare function isPromptSafe(text: string): boolean;
/**
 * Returns the trust grade (A-F) for a prompt.
 */
export declare function getGrade(text: string): string;
/**
 * Returns the numeric trust score (0-100) for a prompt.
 */
export declare function getScore(text: string): number;
