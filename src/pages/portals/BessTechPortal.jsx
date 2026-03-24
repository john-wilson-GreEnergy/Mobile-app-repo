import { useAuth } from '@/lib/AuthContext';

export default function BessTechPortal() {
  const { user } = useAuth();

  return (
    <div className="p-6 bg-background text-white">
      <h1 className="text-2xl font-black mb-4">BESS Tech Portal</h1>
      <p>Welcome, {user?.full_name || 'User'}</p>
    </div>
  );
}