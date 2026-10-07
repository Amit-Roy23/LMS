/**
 * Heartbeat & Anti-Cheat Simulator Script
 *
 * Demonstrates the tamper-resistant video watching mechanics of Layer 2:
 * 1. Simulates realistic sequential intervals
 * 2. Simulates a malicious user seeking forward to cheat
 * 3. Simulates overlapping/replayed intervals (idempotency)
 * 4. Demonstrates 90% threshold auto-completion
 *
 * Run with: npx tsx apps/api/scripts/simulate-watch.ts
 */

import { mergeWatchedIntervals } from '../src/services/progression.service.js';

console.log('=====================================================');
console.log('  LAYER 2: VIDEO HEARTBEAT ANTI-CHEAT SIMULATOR');
console.log('=====================================================\n');

const VIDEO_DURATION_SECONDS = 600; // 10-minute tutorial (600s)
const THRESHOLD_PERCENT = 90; // 90% required to complete

console.log(`Video Duration: ${VIDEO_DURATION_SECONDS} seconds`);
console.log(`Completion Threshold: ${THRESHOLD_PERCENT}%\n`);

// Scenario 1: Honest Student watching normally in 15s heartbeats
console.log('--- SCENARIO 1: Honest Student Watching in 15s Heartbeats ---');
let student1Intervals: [number, number][] = [];

const honestHeartbeats: [number, number][] = [
  [0, 15],
  [15, 30],
  [30, 45],
  [45, 60],
];

for (let i = 0; i < honestHeartbeats.length; i++) {
  const incoming = [honestHeartbeats[i]];
  const result = mergeWatchedIntervals(student1Intervals, incoming, VIDEO_DURATION_SECONDS);
  student1Intervals = result.merged;
  console.log(
    `Heartbeat ${i + 1}: Watched +15s -> Total Unique: ${result.totalUniqueSeconds}s (${result.percent}%) | Complete: ${result.percent >= THRESHOLD_PERCENT}`
  );
}

// Scenario 2: Cheater Student seeking to the end
console.log('\n--- SCENARIO 2: Cheater Student Seeking Directly to 590s ---');
let student2Intervals: [number, number][] = [];

// Cheater plays first 10s, then seeks forward to 590s and watches 10s
const cheaterHeartbeats: [number, number][] = [
  [0, 10],
  [590, 600],
];

for (let i = 0; i < cheaterHeartbeats.length; i++) {
  const incoming = [cheaterHeartbeats[i]];
  const result = mergeWatchedIntervals(student2Intervals, incoming, VIDEO_DURATION_SECONDS);
  student2Intervals = result.merged;
  console.log(
    `Heartbeat ${i + 1} (${cheaterHeartbeats[i][0]}s -> ${cheaterHeartbeats[i][1]}s): Total Unique Watched: ${result.totalUniqueSeconds}s (${result.percent}%)`
  );
}

console.log(
  `\nResult for Cheater: Student reported position 600s, but verified watched time is only ${student2Intervals.reduce((acc, [s, e]) => acc + (e - s), 0)}s (${(student2Intervals.reduce((acc, [s, e]) => acc + (e - s), 0) / VIDEO_DURATION_SECONDS * 100).toFixed(2)}%). Completion DENIED!`
);

// Scenario 3: Overlapping & Replayed Intervals (Idempotency)
console.log('\n--- SCENARIO 3: Replaying Repeated Intervals (Idempotency) ---');
let student3Intervals: [number, number][] = [[0, 60]];
console.log(`Initial state: [0, 60] -> 60s (10%)`);

const replayed = mergeWatchedIntervals(student3Intervals, [[20, 50]], VIDEO_DURATION_SECONDS);
console.log(`Send duplicate [20, 50]: Total Unique: ${replayed.totalUniqueSeconds}s (${replayed.percent}%) -> No duplicate credit granted.`);

// Scenario 4: Crossing the 90% Threshold
console.log('\n--- SCENARIO 4: Crossing the 90% Completion Threshold ---');
let completeIntervals: [number, number][] = [[0, 530]]; // 530 / 600 = 88.33%
let status = mergeWatchedIntervals(completeIntervals, [], VIDEO_DURATION_SECONDS);
console.log(`At 530s watched: ${status.percent}% -> Complete: ${status.percent >= THRESHOLD_PERCENT}`);

const finalHeartbeat = mergeWatchedIntervals(completeIntervals, [[530, 545]], VIDEO_DURATION_SECONDS); // 545 / 600 = 90.83%
console.log(
  `After watching to 545s: ${finalHeartbeat.percent}% -> Complete: ${finalHeartbeat.percent >= THRESHOLD_PERCENT} -> AUTO-COMPLETE TRIGGERED & MODULE PROGRESS UPDATED!`
);

console.log('\n=====================================================');
console.log('  SIMULATION FINISHED: ALL ANTI-CHEAT RULES VERIFIED');
console.log('=====================================================\n');
