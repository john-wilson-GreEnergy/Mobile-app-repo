/**
 * getAssignments — fetches assignment_weeks joined with assignment_items and employee/jobsite names.
 * Supports filtering by week_start and/or employee_fk.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { week_start, employee_fk, limit = 200 } = await req.json();

    // Use Monday of current week as the lower bound so we never miss the current week
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysToMonday);
    const currentWeekStart = monday.toISOString().split('T')[0];

    // 1. Fetch assignment_weeks (primary source) — start from current week's Monday
    let weeksQuery = supabase
      .from('assignment_weeks')
      .select('id, employee_fk, week_start, status, assignment_type')
      .gte('week_start', currentWeekStart)
      .order('week_start', { ascending: true })
      .limit(limit);

    if (week_start) weeksQuery = weeksQuery.eq('week_start', week_start);
    if (employee_fk) weeksQuery = weeksQuery.eq('employee_fk', employee_fk);

    const { data: weeks, error: weeksErr } = await weeksQuery;
    if (weeksErr) return Response.json({ error: weeksErr.message }, { status: 500 });
    if (!weeks?.length) return Response.json({ data: [] });

    // 2. Fetch assignment_items for details
    const weekFks = weeks.map(w => w.id);
    const { data: items, error: itemsErr } = await supabase
      .from('assignment_items')
      .select('id, assignment_week_fk, jobsite_fk, week_start, assignment_type, item_order')
      .in('assignment_week_fk', weekFks)
      .order('item_order', { ascending: true });

    if (itemsErr) return Response.json({ error: itemsErr.message }, { status: 500 });

    const itemMap = Object.fromEntries((items || []).map(i => [i.assignment_week_fk, i]));
    const filteredItems = items || [];

    // 3. Batch-fetch employees, jobsites, and jobsite groups
    const empFks = [...new Set(weeks.map(w => w.employee_fk).filter(Boolean))];
    const siteFks = [...new Set(filteredItems.map(i => i.jobsite_fk).filter(Boolean))];

    const [empRes, siteRes] = await Promise.all([
      empFks.length
        ? supabase.from('employees').select('id, first_name, last_name, role').in('id', empFks)
        : { data: [] },
      siteFks.length
        ? supabase.from('jobsites').select('id, jobsite_name, jobsite_id, jobsite_group, city, state').in('id', siteFks)
        : { data: [] },
    ]);

    const empMap = Object.fromEntries((empRes.data || []).map(e => [e.id, e]));
    const siteMap = Object.fromEntries((siteRes.data || []).map(s => [s.id, s]));

    // Get unique jobsite groups
    const groupNames = [...new Set((siteRes.data || []).map(s => s.jobsite_group).filter(Boolean))];
    const { data: groups = [] } = groupNames.length
      ? await supabase.from('jobsite_groups').select('id, name').in('name', groupNames)
      : { data: [] };
    const groupMap = Object.fromEntries((groups || []).map(g => [g.name, g]));

    // 4. Join everything into flat assignment objects
    const assignments = weeks.map(week => {
      const item = itemMap[week.id];
      const emp = empMap[week.employee_fk];
      const site = item ? siteMap[item.jobsite_fk] : null;
      const groupName = site?.jobsite_group || null;
      const status = week.status === 'published' ? 'confirmed'
        : week.status === 'active' ? 'scheduled'
        : week.status === 'unassigned' ? 'scheduled'
        : week.status || 'scheduled';

      return {
        id: item?.id || week.id,
        assignment_week_id: week.id,
        employee_id: week.employee_fk || null,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : null,
        employee_role: emp?.role || null,
        jobsite_id: item?.jobsite_fk || null,
        jobsite_name: site?.jobsite_name || item?.assignment_type || null,
        jobsite_group: groupName,
        jobsite_ref: site?.jobsite_id || null,
        week_start: week.week_start,
        status,
        rotation_week: item?.assignment_type || week.assignment_type || null,
      };
    });

    return Response.json({ data: assignments });

  } catch (err) {
    console.error('getAssignments error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});