// Mock SDK client for development
export const base44 = {
  entities: {
    User: {
      list: async () => [],
      get: async (id) => null,
      filter: async () => [],
      create: async (data) => ({ id: 'new', ...data }),
      update: async (id, data) => ({ id, ...data }),
      delete: async (id) => true,
    },
    Employee: {
      list: async () => [],
      filter: async () => [],
      get: async (id) => null,
      create: async (data) => ({ id: 'new', ...data }),
      update: async (id, data) => ({ id, ...data }),
      delete: async (id) => true,
    }
  },
  auth: {
    me: async () => ({ full_name: 'Test User', role: 'user', email: 'john.wilson@greeneryresources.com' }),
    updateMe: async (data) => data,
    logout: () => window.location.reload(),
    isAuthenticated: async () => true,
    redirectToLogin: () => {},
  },
  functions: {
    invoke: async (name, payload) => {
      try {
        // Make real HTTP calls to backend functions
        const response = await fetch(`/api/functions/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        return { data };
      } catch (error) {
        console.error(`Function invoke error for ${name}:`, error);
        return { data: null };
      }
    }
  },
  analytics: {
    track: (event) => {}
  },
  users: {
    inviteUser: async (email, role) => true
  }
};