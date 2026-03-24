/**
 * getSurveyEligibleTargets
 * Returns employees the current user is eligible to survey this week.
 *
 * Rules:
 * - Cannot survey yourself
 * - Role pairings allowed:
 *     bess_tech    → site_lead, site_manager
 *     site_lead    → bess_tech, site_manager
 *     site_manager → bess_tech, site_lead
 * - Target must be assigned to the SAME jobsite (same jobsite_fk) this week
 * - Rotation / non-jobsite assignment weeks are excluded (no jobsite_fk)
 * - Cannot submit more than 1 survey per target per week
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { format } from 'npm:date-fns@3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

const ALLOWED_SURVEY_TARGETS = {
  bess_tech:    ['site_lead', 'site_manager'],
  site_lead:    ['bess_tech', 'site_manager'],
  site_manager: ['bess_tech', 'site_lead'],
};

const ROTATION_TYPES = ['rotation', 'vacation', 'personal', 'pto', 'off'];

function isRotationAssignment(assignment_type) {
  if (!assignment_type) return false;
  return ROTATION_TYPES.some(r => assignment_type.toLowerCase().includes(r));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { employee_id, week_start } = await req.json();
    if (!employee_id) return Response.json({ error: 'employee_id required' }, { status: 400 });

    // 1. Get the current user's assignment_week for this week
    const { data: myWeeks, error: myWeeksErr } = await supabase
      .from('assignment_weeks')
      .select('id, employee_fk, week_start, assignment_type')
      .eq('employee_fk', employee_id)
      .eq('week_start', week_start)
      .limit(1);

    if (myWeeksErr) return Response.json({ error: myWeeksErr.message }, { status: 500 });
    if (!myWeeks?.length) return Response.json({ data: [], reason: 'no_assignment' });

    const myWeek = myWeeks[0];

    // 2. Get the assignment_item for this week to find the jobsite
    const { data: myItems } = await supabase
      .from('assignment_items')
      .select('id, assignment_week_fk, jobsite_fk, assignment_type')
      .eq('assignment_week_fk', myWeek.id)
      .limit(1);

    const myItem = myItems?.[0];

    // If no jobsite_fk or it's a rotation assignment, the user is ineligible to survey
    if (!myItem?.jobsite_fk || isRotationAssignment(myItem.assignment_type || myWeek.assignment_type)) {
      return Response.json({ data: [], reason: 'rotation_week' });
    }

    const myJobsiteFk = myItem.jobsite_fk;

    // 3. Get my employee record to check role
    const { data: myEmpRows } = await supabase
      .from('employees')
      .select('id, role')
      .eq('id', employee_id)
      .limit(1);

    const myRole = myEmpRows?.[0]?.role;
    const allowedTargetRoles = ALLOWED_SURVEY_TARGETS[myRole];

    if (!allowedTargetRoles) {
      return Response.json({ data: [], reason: 'role_not_eligible' });
    }

    // 4. Find all assignment_items for this week pointing to the same jobsite
    const { data: siteItems, error: siteItemsErr } = await supabase
      .from('assignment_items')
      .select('id, assignment_week_fk, jobsite_fk, assignment_type')
      .eq('jobsite_fk', myJobsiteFk);

    if (siteItemsErr) return Response.json({ error: siteItemsErr.message }, { status: 500 });

    // Filter out rotation items
    const validSiteItems = (siteItems || []).filter(i => !isRotationAssignment(i.assignment_type));
    const siteWeekFks = [...new Set(validSiteItems.map(i => i.assignment_week_fk))];

    if (!siteWeekFks.length) return Response.json({ data: [] });

    // 5. Get assignment_weeks for those items in the same week
    const { data: siteWeeks } = await supabase
      .from('assignment_weeks')
      .select('id, employee_fk, week_start, assignment_type')
      .in('id', siteWeekFks)
      .eq('week_start', week_start);

    // Filter out rotation weeks
    const validWeeks = (siteWeeks || []).filter(w => !isRotationAssignment(w.assignment_type));

    // Get co-worker employee IDs (excluding self)
    const coworkerIds = [...new Set(
      validWeeks
        .map(w => w.employee_fk)
        .filter(id => id && id !== employee_id)
    )];

    if (!coworkerIds.length) return Response.json({ data: [] });

    // 6. Fetch employee records for coworkers, filter by allowed roles
    const { data: coworkers } = await supabase
      .from('employees')
      .select('id, first_name, last_name, role, email')
      .in('id', coworkerIds)
      .in('role', allowedTargetRoles);

    if (!coworkers?.length) return Response.json({ data: [] });

    // 7. Check which of these have already been surveyed this week
    const { data: existingSubmissions } = await supabase
      .from('survey_submissions')
      .select('target_id')
      .eq('rater_id', employee_id)
      .eq('week_start_date', week_start)
      .in('target_id', coworkers.map(c => c.id));

    const alreadySurveyedIds = new Set((existingSubmissions || []).map(s => s.target_id));

    // 8. Return eligible targets (not yet surveyed this week)
    const eligible = coworkers
      .filter(c => !alreadySurveyedIds.has(c.id))
      .map(c => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        role: c.role,
        email: c.email,
        already_surveyed: false,
      }));

    // Also return already-surveyed for info
    const alreadySurveyed = coworkers
      .filter(c => alreadySurveyedIds.has(c.id))
      .map(c => ({ ...c, already_surveyed: true }));

    return Response.json({ data: eligible, already_surveyed: alreadySurveyed });

  } catch (err) {
    console.error('getSurveyEligibleTargets error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});