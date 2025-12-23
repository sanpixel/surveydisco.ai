import React, { createContext, useContext, useState } from 'react';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      const password = prompt('Enter admin password:');
      if (password === 'kingsport') {
        setIsAdmin(true);
      }
    }
  };

  return (
    <AdminContext.Provider value={{ isAdmin, toggleAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
