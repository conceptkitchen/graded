"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = void 0;
exports.isPromptSafe = isPromptSafe;
exports.getGrade = getGrade;
exports.getScore = getScore;
var scanner_js_1 = require("./scanner.js");
Object.defineProperty(exports, "scan", { enumerable: true, get: function () { return scanner_js_1.scanPrompt; } });
const scanner_js_2 = require("./scanner.js");
/**
 * Quick check: returns true if the prompt grades A or B (safe).
 */
function isPromptSafe(text) {
    const result = (0, scanner_js_2.scanPrompt)(text);
    return result.scoreData.grade === "A" || result.scoreData.grade === "B";
}
/**
 * Returns the trust grade (A-F) for a prompt.
 */
function getGrade(text) {
    return (0, scanner_js_2.scanPrompt)(text).scoreData.grade;
}
/**
 * Returns the numeric trust score (0-100) for a prompt.
 */
function getScore(text) {
    return (0, scanner_js_2.scanPrompt)(text).scoreData.score;
}
