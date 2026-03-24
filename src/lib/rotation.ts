/**
 * Rotation week detection logic ported from the web app.
 * Handles 3-on-1-off rotation schedules with A/B/C/D groups.
 */

export const GROUP_COLORS = {
  'A': 'text-black bg-black/10 border-black/20',
  'B': 'text-red-400 bg-red-500/10 border-red-500/20',
  'C': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'D': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const ROTATION_GROUPS = {
  'A': { weeks_on: 3, weeks_off: 1, offset: 3 },
  'B': { weeks_on: 3, weeks_off: 1, offset: 2 },
  'C': { weeks_on: 3, weeks_off: 1, offset: 1 },
  'D': { weeks_on: 3, weeks_off: 1, offset: 0 },
};

const GROUP_ANCHOR = '2026-03-09';

function getWeekStart(d: Date): number {
  const temp = new Date(d);
  temp.setUTCHours(0, 0, 0, 0);
  const day = temp.getUTCDay();
  const diff = temp.getUTCDate() - day;
  return new Date(Date.UTC(temp.getUTCFullYear(), temp.getUTCMonth(), diff)).getTime();
}

/**
 * Determine the expected rotation group for a given week start date.
 * Current week (2026-03-23) is Group A.
 * Next: D, then C, then B, cycle repeats.
 */
export function getExpectedRotationGroup(weekStartDate: string): string {
  const date = new Date(weekStartDate);
  const anchor = new Date(GROUP_ANCHOR);
  
  const anchorStart = getWeekStart(anchor);
  const targetStart = getWeekStart(date);
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const weeksDiff = Math.round((targetStart - anchorStart) / msPerWeek);
  
  // Weekly rotation pattern starting from A
  const pattern = ['A', 'D', 'C', 'B'];
  const idx = ((weeksDiff % 4) + 4) % 4;
  return pattern[idx];
}

/**
 * Check if a week is expected to be a rotation week for an employee's specific group.
 * @param weekStartDate The week start date as a string (YYYY-MM-DD)
 * @param rotationGroup The employee's rotation group (A, B, C, D). If not provided, checks global cycle.
 */
export function isExpectedRotationWeek(weekStartDate: string, rotationGroup?: string): boolean {
  const date = new Date(weekStartDate);
  const anchor = new Date(GROUP_ANCHOR);
  
  const anchorStart = getWeekStart(anchor);
  const targetStart = getWeekStart(date);
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const weeksDiff = Math.round((targetStart - anchorStart) / msPerWeek);
  
  if (rotationGroup && ROTATION_GROUPS[rotationGroup]) {
    const { offset, weeks_on } = ROTATION_GROUPS[rotationGroup];
    const cycle = weeks_on + 1; // 3 on + 1 off = 4
    // Apply offset for staggered groups
    const normalizedWeeks = (((weeksDiff - offset) % cycle) + cycle) % cycle;
    return normalizedWeeks >= weeks_on;
  }
  
  // Fallback: check if it's week 3 of the global 4-week cycle
  const positionInCycle = ((weeksDiff % 4) + 4) % 4;
  return positionInCycle === 3;
}