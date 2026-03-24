import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

const ALLOWED_TABLES = new Set([
  'employees', 'jobsites', 'jobsite_groups',
  'announcements', 'notifications',
  'assignments', 'assignment_weeks', 'assignment_items',
  'portal_requests', 'portal_actions', 'portal_action_completions',
  'activity_log', 'recent_activity', 'assignment_audit_log',
  'chat_messages', 'chat_attachments', 'chat_space_memberships',
  'rotation_configs', 'survey_questions', 'survey_submissions',
  'user_roles',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, action, filters, data, id, order, limit, select } = await req.json();

    if (!table || !action) {
      return Response.json({ error: 'Missing table or action' }, { status: 400 });
    }

    if (!ALLOWED_TABLES.has(table)) {
      return Response.json({ error: `Table not allowed: ${table}` }, { status: 403 });
    }

    let query;

    if (action === 'select') {
      // Allow custom select string for joins (e.g. "*, jobsites(*)")
      query = supabase.from(table).select(select || '*');

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      if (order?.column) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }

      if (limit) query = query.limit(limit);

    } else if (action === 'insert') {
      query = supabase.from(table).insert(data).select();

    } else if (action === 'update') {
      if (!id) return Response.json({ error: 'id required for update' }, { status: 400 });
      query = supabase.from(table).update(data).eq('id', id).select();

    } else if (action === 'delete') {
      if (!id) return Response.json({ error: 'id required for delete' }, { status: 400 });
      query = supabase.from(table).delete().eq('id', id);

    } else {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { data: result, error } = await query;

    if (error) {
      console.error(`Supabase error [${table}/${action}]:`, error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: result });

  } catch (err) {
    console.error('supabaseProxy error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});