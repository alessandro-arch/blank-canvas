import { createContext, useContext, useState, ReactNode } from "react";

type TabType = "home" | "messages" | "news" | "help";

interface SupportCenterContextType {
  isOpen: boolean;
  activeTab: TabType;
  open: (tab?: TabType) => void;
  close: () => void;
  setActiveTab: (tab: TabType) => void;
}

const SupportCenterContext = createContext<SupportCenterContextType | undefined>(undefined);

export function SupportCenterProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("home");

  const open = (tab?: TabType) => {
    if (tab) setActiveTab(tab);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  return (
    <SupportCenterContext.Provider value={{ isOpen, activeTab, open, close, setActiveTab }}>
      {children}
    </SupportCenterContext.Provider>
  );
}

export function useSupportCenter() {
  const ctx = useContext(SupportCenterContext);
  if (!ctx) throw new Error("useSupportCenter must be used within SupportCenterProvider");
  return ctx;
}
