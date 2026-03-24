import { useAuth } from '@/lib/AuthContext';

export const useEmployeeRole = () => {
  const { user } = useAuth();
  
  // Mock implementation—returns bess_tech by default
  const employeeRole = user?.role || 'bess_tech';

  return { employeeRole };
};