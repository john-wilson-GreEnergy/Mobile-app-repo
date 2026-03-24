/**
 * db.js — Supabase-backed data layer
 * Maps to the real Supabase schema tables and field names.
 *
 * Usage:
 *   import { db } from '@/lib/db';
 *   const employees      = await db.employees.list();
 *   const filtered       = await db.employees.filter({ role: 'admin' });
 *   const newRec         = await db.employees.create({ first_name: 'John', ... });
 *   await db.employees.update(id, { is_active: false });
 *   await db.employees.delete(id);
 */

import { base44 } from '@/api/base44Client';

async function query(table, action, opts = {}) {
  const res = await base44.functions.invoke('supabaseProxy', { table, action, ...opts });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data?.data ?? res.data;
}

/** Fetch assignments joined with employee + jobsite names */
export async function fetchAssignments({ week_start, employee_fk, limit } = {}) {
  const res = await base44.functions.invoke('getAssignments', { week_start, employee_fk, limit });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data?.data ?? [];
}

function makeTable(table, defaultOrder = 'created_at') {
  return {
    list: (orderColumn = defaultOrder, lim = 200) =>
      query(table, 'select', {
        order: { column: orderColumn.replace('-', ''), ascending: !orderColumn.startsWith('-') },
        limit: lim,
      }),

    filter: (filters = {}, orderColumn = defaultOrder, lim = 200) =>
      query(table, 'select', {
        filters,
        order: { column: orderColumn.replace('-', ''), ascending: !orderColumn.startsWith('-') },
        limit: lim,
      }),

    get: (id) =>
      query(table, 'select', { filters: { id } }).then(rows => rows?.[0] ?? null),

    create: (data) =>
      query(table, 'insert', { data }).then(rows => rows?.[0] ?? rows),

    update: (id, data) =>
      query(table, 'update', { id, data }).then(rows => rows?.[0] ?? rows),

    delete: (id) =>
      query(table, 'delete', { id }),
  };
}

export const db = {
  // Core entities — table names match Supabase schema exactly
  employees:          makeTable('employees'),
  jobsites:           makeTable('jobsites', 'jobsite_name'),
  jobsite_groups:     makeTable('jobsite_groups', 'name'),
  announcements:      makeTable('announcements'),
  notifications:      makeTable('notifications'),

  // Scheduling
  assignments:        makeTable('assignments', 'week_start'),
  assignment_weeks:   makeTable('assignment_weeks', 'week_start'),
  assignment_items:   makeTable('assignment_items', 'week_start'),

  // Requests & portal
  portal_requests:    makeTable('portal_requests'),
  portal_actions:     makeTable('portal_actions', 'sort_order'),
  portal_action_completions: makeTable('portal_action_completions'),

  // Activity & audit
  activity_log:       makeTable('activity_log'),
  recent_activity:    makeTable('recent_activity'),
  assignment_audit_log: makeTable('assignment_audit_log'),

  // Chat
  chat_messages:      makeTable('chat_messages'),
  chat_attachments:   makeTable('chat_attachments'),
  chat_space_memberships: makeTable('chat_space_memberships', 'email'),

  // Rotation & surveys
  rotation_configs:   makeTable('rotation_configs'),
  survey_questions:   makeTable('survey_questions', 'display_order'),
  survey_submissions: makeTable('survey_submissions'),

  // User roles
  user_roles:         makeTable('user_roles'),
};

// ─── Field mapping helpers ───────────────────────────────────────────────────
// The Supabase schema uses different field names than the Base44 entities.
// Use these when reading data from Supabase to keep component code consistent.

/** Normalize a Supabase employee row to a consistent shape used across portals */
export function normalizeEmployee(emp) {
  return {
    ...emp,
    // `role` field = actual job role (site_manager, site_lead, bess_tech, hr, admin)
    // `portal_role` = access tier (admin / user) — used separately for auth
    role: emp.role || 'bess_tech',
    current_jobsite: emp.current_jobsite || null,
    rotation_type: emp.rotation_group || null,
    employee_id_ref: emp.employee_id_ref ? String(emp.employee_id_ref) : null,
    phone: emp.phone || null,
    avatar_url: emp.avatar_url || null,
  };
}

/** Normalize a Supabase jobsite row */
export function normalizeJobsite(site) {
  return {
    ...site,
    jobsite_name: site.jobsite_name,
    jobsite_id_ref: site.jobsite_id || site.jobsite_alias || null,
    jobsite_alias: site.jobsite_alias || null,
    // customer field is the grouping/customer name; jobsite_group may also be set
    jobsite_group: site.jobsite_group || site.customer || null,
    address: site.address1 || site.full_address || null,
    city: site.city,
    state: site.state,
    latitude: site.lat ? Number(site.lat) : null,
    longitude: site.lng ? Number(site.lng) : null,
    min_staffing: site.min_staffing ? Number(site.min_staffing) : 1,
    safety_score: site.safety_score || null,
    drive_time_minutes: site.drive_time_minutes || null,
    notes: site.notes || null,
    // is_active is null in DB — treat null as active
    is_active: site.is_active !== false,
    status: site.is_active === false ? 'offline' : (site.status || 'operational'),
  };
}

/** Normalize a Supabase assignment_weeks + assignment_items row into a flat assignment */
export function normalizeAssignment(week, item = null) {
  return {
    id: item?.id || week.id,
    employee_id: week.employee_fk,
    jobsite_id: item?.jobsite_fk || null,
    jobsite_name: item?.jobsite_name || null,
    week_start: week.week_start || item?.week_start,
    status: week.status === 'published' ? 'confirmed' : week.status === 'working' ? 'scheduled' : week.status,
    rotation_week: week.assignment_type || null,
    notes: null,
  };
}

/** Normalize a Supabase portal_request row */
export function normalizeRequest(req) {
  // Map real request_type values to our UI types
  const typeMap = {
    rotation_change: 'schedule_change',
    time_off: 'time_off',
    equipment: 'equipment',
    general: 'general',
  };
  const subject = req.details?.split('\n')[0]?.slice(0, 80)
    || req.request_type?.replace(/_/g, ' ')
    || 'Request';
  return {
    ...req,
    id: req.id,
    employee_id: req.employee_fk,
    request_type: typeMap[req.request_type] || 'general',
    subject,
    description: req.details || '',
    status: req.status === 'approved' ? 'approved' : req.status === 'denied' ? 'denied' : 'pending',
    priority: 'medium',
    response_note: req.deny_reason || null,
    created_date: req.created_at,
  };
}

/** Normalize a Supabase announcement */
export function normalizeAnnouncement(ann) {
  return {
    ...ann,
    body: ann.message,
    priority: ann.level === 'urgent' ? 'urgent' : ann.level === 'warning' ? 'high' : ann.level === 'info' ? 'medium' : 'low',
    active: ann.active,
    start_date: ann.start_date,
    end_date: ann.end_date,
  };
}