import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, normalizeEmployee } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Search, ChevronRight, ChevronLeft, Phone,
  Mail, MapPin, Shield, Circle, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_CONFIG = {
  bess_tech: { label: 'BESS Tech', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  site_manager: { label: 'Site Manager', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  site_lead: { label: 'Site Lead', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  hr: { label: 'HR', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  admin: { label: 'Admin', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export default function Employees() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: empRows = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.employees.list(),
  });
  const employees = empRows.map(normalizeEmployee);

  const filtered = employees.filter(emp => {
    const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchSearch = !searchQuery ||
      name.includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id_ref?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || emp.role === roleFilter;
    return matchSearch && matchRole && emp.is_active;
  });

  if (selectedEmployee) {
    return <EmployeeDetail employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
  }

  const roles = ['all', 'bess_tech', 'site_manager', 'site_lead', 'hr', 'admin'];

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-white text-sm placeholder-gray-600 flex-1 outline-none"
          />
        </div>

        {/* Role Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {roles.map(r => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.93 }}
              onClick={() => setRoleFilter(r)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all ${
                roleFilter === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-gray-500'
              }`}
            >
              {r === 'all' ? 'All' : ROLE_CONFIG[r]?.label || r}
            </motion.button>
          ))}
        </div>

        {/* Count */}
        <div className="flex items-center justify-between px-1">
          <span className="text-gray-500 text-xs font-bold">{filtered.length} employees</span>
          <span className="text-primary text-xs font-bold">{employees.filter(e => e.is_active).length} active</span>
        </div>

        {/* Employee List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-3xl bg-card border border-border animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-white font-bold">No employees found</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <EmployeeCard emp={emp} onClick={() => setSelectedEmployee(emp)} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({ emp, onClick }) {
  const role = ROLE_CONFIG[emp.role] || { label: emp.role, color: 'text-gray-400 bg-white/5 border-white/10' };
  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-3xl bg-card border border-border hover:border-primary/20 transition-all active-scale"
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-black text-sm">{initials}</span>
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-white font-bold text-sm truncate">{emp.first_name} {emp.last_name}</p>
        <p className="text-gray-500 text-xs truncate">{emp.email}</p>
        {emp.current_jobsite && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-gray-600 text-xs truncate">{emp.current_jobsite}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl border ${role.color}`}>
          {role.label}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </div>
    </motion.button>
  );
}

function EmployeeDetail({ employee, onBack }) {
  const role = ROLE_CONFIG[employee.role] || { label: employee.role, color: 'text-gray-400 bg-white/5 border-white/10' };
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center active-scale mb-6"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </motion.button>

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center mb-3">
            <span className="text-primary text-2xl font-black">{initials}</span>
          </div>
          <h2 className="text-white font-black text-xl">{employee.first_name} {employee.last_name}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{employee.email}</p>
          <span className={`mt-2 text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl border ${role.color}`}>
            {role.label}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {[
            { label: 'Employee ID', value: employee.employee_id_ref || 'N/A', icon: Shield },
            { label: 'Phone', value: employee.phone || 'N/A', icon: Phone },
            { label: 'Current Site', value: employee.current_jobsite || 'Unassigned', icon: MapPin },
            { label: 'Rotation', value: employee.rotation_type || 'N/A', icon: Circle },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs">{item.label}</p>
                  <p className="text-white font-bold text-sm truncate">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}