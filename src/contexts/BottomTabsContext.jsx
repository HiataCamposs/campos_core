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

export function useBottomTabs() {
  return useContext(BottomTabsContext);
}
