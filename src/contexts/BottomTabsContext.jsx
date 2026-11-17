import { createContext, useContext, useState } from "react";

const BottomTabsContext = createContext();

export function BottomTabsProvider({ children }) {
  const [tabs, setTabs] = useState(null);
  return (
    <BottomTabsContext.Provider value={{ tabs, setTabs }}>
      {children}
    </BottomTabsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook junto do provider (padrão de context)
export function useBottomTabs() {
  return useContext(BottomTabsContext);
}
