import React, { createContext, useContext, useState } from 'react';

type TabsContextType = {
    activeTab: string;
    setActiveTab: (id: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
    defaultValue: string;
    className?: string;
    children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, className = '', children }) => {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
};

export interface TabsListProps {
    className?: string;
    children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ className = '', children }) => {
    return (
        <div className={`flex space-x-2 ${className}`} role="tablist">
            {children}
        </div>
    );
};

export interface TabsTriggerProps {
    value: string;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, className = '', children, onClick }) => {
    const context = useContext(TabsContext);

    if (!context) {
        throw new Error('TabsTrigger must be used within a Tabs component');
    }

    const { activeTab, setActiveTab } = context;
    const isActive = activeTab === value;

    const handleClick = () => {
        setActiveTab(value);
        if (onClick) {
            onClick();
        }
    };

    return (
        <button
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? 'active' : 'inactive'}
            onClick={handleClick}
            className={`px-4 py-2 text-sm font-medium ${
                isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            } ${className}`}
        >
            {children}
        </button>
    );
};

export interface TabsContentProps {
    value: string;
    className?: string;
    children: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, className = '', children }) => {
    const context = useContext(TabsContext);

    if (!context) {
        throw new Error('TabsContent must be used within a Tabs component');
    }

    const { activeTab } = context;

    if (activeTab !== value) {
        return null;
    }

    return (
        <div
            role="tabpanel"
            data-state={activeTab === value ? 'active' : 'inactive'}
            className={className}
        >
            {children}
        </div>
    );
};
