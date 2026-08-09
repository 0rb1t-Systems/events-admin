import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { organizationApi } from '../services/organization';

export interface Organization {
    id?: number;
    name: string;
    founded_date?: string;
    logo_url?: string;
    logo_dark_url?: string;
    icon_url?: string;
    website_url?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    created_at?: string;
    updated_at?: string;
}

interface OrganizationContextType {
    organization: Organization | null;
    loading: boolean;
    error: string | null;
    setOrganization: (org: Organization) => void;
    updateOrganizationLogo: (logoUrl: string) => void;
    removeOrganizationLogo: () => void;
    updateOrganizationDarkLogo: (logoUrl: string) => void;
    removeOrganizationDarkLogo: () => void;
    updateOrganizationIcon: (iconUrl: string) => void;
    removeOrganizationIcon: () => void;
    loadOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
};

interface OrganizationProviderProps {
    children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
    const [organization, setOrganizationState] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadOrganization = async () => {
        setLoading(true);
        try {
            const data = await organizationApi.getProfile();
            setOrganizationState(data);
            setError(null);
        } catch (error: any) {
            setError(error.message || 'Failed to load organization');
            console.log('Failed to load organization data, using defaults');
        } finally {
            setLoading(false);
        }
    };

    // Load organization on mount
    useEffect(() => {
        loadOrganization();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setOrganization = (org: Organization) => {
        setOrganizationState(org);
        setError(null);
    };

    const updateOrganizationLogo = (logoUrl: string) => {
        if (organization) {
            setOrganizationState({ ...organization, logo_url: logoUrl });
        }
    };

    const removeOrganizationLogo = () => {
        if (organization) {
            setOrganizationState({ ...organization, logo_url: undefined });
        }
    };

    const updateOrganizationDarkLogo = (logoUrl: string) => {
        if (organization) {
            setOrganizationState({ ...organization, logo_dark_url: logoUrl });
        }
    };

    const removeOrganizationDarkLogo = () => {
        if (organization) {
            setOrganizationState({ ...organization, logo_dark_url: undefined });
        }
    };

    const updateOrganizationIcon = (iconUrl: string) => {
        if (organization) {
            setOrganizationState({ ...organization, icon_url: iconUrl });
        }
    };

    const removeOrganizationIcon = () => {
        if (organization) {
            setOrganizationState({ ...organization, icon_url: undefined });
        }
    };

    // Update favicon and page title when organization changes
    useEffect(() => {
        if (organization) {
            // Update page title with organization name
            if (organization.name) {
                document.title = organization.name;
            }

            // Update favicon
            const updateFavicon = (iconUrl: string | null | undefined) => {
                // Remove all existing favicon links
                const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
                existingLinks.forEach(link => link.remove());

                if (iconUrl) {
                    // Determine MIME type based on file extension
                    let mimeType = 'image/x-icon';
                    const lowerUrl = iconUrl.toLowerCase();
                    if (lowerUrl.endsWith('.svg')) {
                        mimeType = 'image/svg+xml';
                    } else if (lowerUrl.endsWith('.png')) {
                        mimeType = 'image/png';
                    } else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (lowerUrl.endsWith('.gif')) {
                        mimeType = 'image/gif';
                    }

                    // Add new favicon
                    const link = document.createElement('link');
                    link.rel = 'icon';
                    link.type = mimeType;
                    link.href = iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`;
                    document.head.appendChild(link);

                    // Also add as shortcut icon for better browser compatibility
                    const shortcutLink = document.createElement('link');
                    shortcutLink.rel = 'shortcut icon';
                    shortcutLink.type = mimeType;
                    shortcutLink.href = iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`;
                    document.head.appendChild(shortcutLink);
                }
            };

            updateFavicon(organization.icon_url);
        }
    }, [organization]);

    const value: OrganizationContextType = {
        organization,
        loading,
        error,
        setOrganization,
        updateOrganizationLogo,
        removeOrganizationLogo,
        updateOrganizationDarkLogo,
        removeOrganizationDarkLogo,
        updateOrganizationIcon,
        removeOrganizationIcon,
        loadOrganization,
    };

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
};
