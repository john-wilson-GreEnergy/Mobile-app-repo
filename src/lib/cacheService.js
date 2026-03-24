export const fetchAndCacheAssignments = async (employeeId, fetchFn, isOnline) => {
  try {
    const data = await fetchFn();
    return data || [];
  } catch {
    return [];
  }
};

export const clearCache = async () => {
  // No-op
};