import React, { createContext, useState, useContext } from 'react';

const ActivePortalContext = createContext();

export const ActivePortalProvider = ({ children }) => {
  const [activePortal, setActivePortal] = useState('bess_tech');

  return (
    <ActivePortalContext.Provider value={{ activePortal, setActivePortal }}>
      {children}
    </ActivePortalContext.Provider>
  );
};

export const useActivePortal = () => {
  const context = useContext(ActivePortalContext);
  if (!context) {
    throw new Error('useActivePortal must be used within ActivePortalProvider');
  }
  return context;
};