import React from "react";
import { lazy } from "react";
import { Navigate } from "react-router-dom";

// Dashboard
const Dashboard = lazy(() => import("../pages/dashboard"));

// Not Found
const NotFound = lazy(() => import("../pages/404"));

// Authentication
const Login = lazy(() => import("../pages/login"));
const Profile = lazy(() => import("../pages/profile"));

// Error pages
const Unauthorized = lazy(() => import("../components/errors/Unauthorized"));

// User (Configuration)
const User = lazy(() => import("../pages/user"));

// Settings (Configuration)
const Settings = lazy(() => import("../pages/settings"));
const SettingsMail = lazy(() => import("../pages/settings/mail"));
const SettingsRoles = lazy(() => import("../pages/settings/roles"));
const SettingsPackages = lazy(() => import("../pages/settings/packages"));
const SettingsEventCategories = lazy(
    () => import("../pages/settings/event-categories")
);
const SettingsInvitationTemplates = lazy(
    () => import("../pages/settings/invitation-templates")
);
const SettingsCommission = lazy(() => import("../pages/settings/commission"));
const SettingsApiClients = lazy(() => import("../pages/settings/api-clients"));

// Organization (Configuration)
const Organization = lazy(() => import("../pages/organization"));

// Logs (System Monitoring)
const Logs = lazy(() => import("../pages/logs"));
const QrScanLog = lazy(() => import("../pages/qr-scan-log"));
const LockScreen = lazy(() => import("../pages/lock-screen"));

// Trash Management (System Monitoring)
const TrashPage = lazy(() => import("../pages/trash"));
const TrashUsers = lazy(() => import("../pages/trash/Users"));
const TrashRoles = lazy(() => import("../pages/trash/Roles"));
const TrashOrganizers = lazy(() => import("../pages/trash/Organizers"));
const TrashEvents = lazy(() => import("../pages/trash/Events"));
const TrashEventCategories = lazy(
    () => import("../pages/trash/EventCategories")
);

// Organizers (oversight)
const Organizer = lazy(() => import("../pages/organizer"));
const OrganizerShow = lazy(() => import("../pages/organizer/show"));

// Events (oversight)
const Event = lazy(() => import("../pages/event"));
const EventShow = lazy(() => import("../pages/event/show"));

// Payouts (Admin System — Phase 6)
const Payout = lazy(() => import("../pages/payout"));
const PayoutShow = lazy(() => import("../pages/payout/show"));

// Payments (platform-wide — Prompt 14)
const Payment = lazy(() => import("../pages/payment"));

// Certificates (platform-wide — Prompt 14)
const Certificate = lazy(() => import("../pages/certificate"));
const CertificateShow = lazy(() => import("../pages/certificate/show"));

// Subscriptions (platform-wide — Prompt 14)
const Subscription = lazy(() => import("../pages/subscription"));

// Feedback (platform content oversight — Prompt 13)
const Feedback = lazy(() => import("../pages/feedback"));
const FeedbackShow = lazy(() => import("../pages/feedback/show"));

// Redirect component - now redirects from root (/) to /dashboard
const RedirectToDashboard = () => <Navigate to="/dashboard" replace />;

// Define route types
export type RouteConfig = {
    path: string;
    element: React.ReactNode;
    layout: "default" | "blank";
    errorElement?: React.ReactNode;
    isPublic?: boolean;
    children?: RouteConfig[];
    permissions?: string[];
};

// Public routes - accessible without authentication
export const publicRoutes: RouteConfig[] = [
    // auth
    {
        path: "/auth/login",
        element: <Login />,
        layout: "blank",
        isPublic: true,
    },
    {
        path: "/auth/lock-screen",
        element: <LockScreen />,
        layout: "blank",
        isPublic: true,
    },
];

// Protected routes - require authentication
export const protectedRoutes: RouteConfig[] = [
    // Redirect from root to dashboard
    {
        path: "/",
        element: <RedirectToDashboard />,
        layout: "default",
        permissions: ["view dashboard"],
    },

    // Dashboard at /dashboard path
    {
        path: "/dashboard",
        element: <Dashboard />,
        layout: "default",
        permissions: ["view dashboard"],
    },

    // CONFIGURATION SECTION
    // Users
    {
        path: "/users",
        element: <User />,
        layout: "default",
        permissions: ["view users"],
    },

    // Organizers (Admin oversight)
    {
        path: "/organizers",
        element: <Organizer />,
        layout: "default",
        permissions: ["view organizers"],
    },
    {
        path: "/organizers/:id",
        element: <OrganizerShow />,
        layout: "default",
        permissions: ["view organizers"],
    },

    // Events (Admin oversight)
    {
        path: "/events",
        element: <Event />,
        layout: "default",
        permissions: ["view events"],
    },
    {
        path: "/events/:id",
        element: <EventShow />,
        layout: "default",
        permissions: ["view events"],
    },

    // Payouts (Admin System)
    {
        path: "/payouts",
        element: <Payout />,
        layout: "default",
        permissions: ["view payouts"],
    },
    {
        path: "/payouts/:id",
        element: <PayoutShow />,
        layout: "default",
        permissions: ["view payouts"],
    },

    // Payments (platform-wide overview)
    {
        path: "/payments",
        element: <Payment />,
        layout: "default",
        permissions: ["view payments"],
    },

    // Certificates (platform-wide)
    {
        path: "/certificates",
        element: <Certificate />,
        layout: "default",
        permissions: ["view certificates"],
    },
    {
        path: "/certificates/:id",
        element: <CertificateShow />,
        layout: "default",
        permissions: ["view certificates"],
    },

    // Subscriptions (platform-wide overview)
    {
        path: "/subscriptions",
        element: <Subscription />,
        layout: "default",
        permissions: ["view organizer subscriptions"],
    },

    // Feedback (platform content oversight)
    {
        path: "/feedback",
        element: <Feedback />,
        layout: "default",
        permissions: ["view event feedback"],
    },
    {
        path: "/feedback/:id",
        element: <FeedbackShow />,
        layout: "default",
        permissions: ["view event feedback"],
    },

    // Settings (with nested tabs)
    {
        path: "/settings",
        element: <Settings />,
        layout: "default",
        permissions: [
            "manage settings",
            "view packages",
            "view event categories",
            "view invitation templates",
            "view organizations",
            "view api clients",
        ],
        children: [
            {
                path: "mail",
                element: <SettingsMail />,
                layout: "default",
                permissions: ["manage settings"],
            },
            {
                path: "roles",
                element: <SettingsRoles />,
                layout: "default",
                permissions: ["manage settings"],
            },
            {
                path: "packages",
                element: <SettingsPackages />,
                layout: "default",
                permissions: ["view packages"],
            },
            {
                path: "event-categories",
                element: <SettingsEventCategories />,
                layout: "default",
                permissions: ["view event categories"],
            },
            {
                path: "invitation-templates",
                element: <SettingsInvitationTemplates />,
                layout: "default",
                permissions: ["view invitation templates"],
            },
            {
                path: "commission",
                element: <SettingsCommission />,
                layout: "default",
                permissions: ["manage settings"],
            },
            {
                path: "api-clients",
                element: <SettingsApiClients />,
                layout: "default",
                permissions: ["view api clients"],
            },
            {
                path: "organization",
                element: <Organization />,
                layout: "default",
                permissions: ["view organizations"],
            },
        ],
    },

    // SYSTEM MONITORING SECTION
    // Logs
    {
        path: "/logs",
        element: <Logs />,
        layout: "default",
        permissions: ["view logs"],
    },

    // QR Scan History
    {
        path: "/qr-scan-logs",
        element: <QrScanLog />,
        layout: "default",
        permissions: ["view qr scan logs"],
    },

    // Trash Items (with nested tabs)
    {
        path: "/trash",
        element: <TrashPage />,
        layout: "default",
        permissions: ["view trash items"],
        children: [
            {
                path: "users",
                element: <TrashUsers />,
                layout: "default",
                permissions: ["view trash items"],
            },
            {
                path: "roles",
                element: <TrashRoles />,
                layout: "default",
                permissions: ["view trash items"],
            },
            {
                path: "organizers",
                element: <TrashOrganizers />,
                layout: "default",
                permissions: ["view trash items"],
            },
            {
                path: "events",
                element: <TrashEvents />,
                layout: "default",
                permissions: ["view trash items"],
            },
            {
                path: "event-categories",
                element: <TrashEventCategories />,
                layout: "default",
                permissions: ["view trash items"],
            },
        ],
    },

    // Unauthorized access page
    {
        path: "/unauthorized",
        element: <Unauthorized />,
        layout: "blank",
    },

    // Profile page
    {
        path: "/auth/profile",
        element: <Profile />,
        layout: "default",
        permissions: [], // No special permissions, just authenticated
    },

    // apply 404
    {
        path: "*",
        element: <NotFound />,
        layout: "blank",
    },
];

// Combine all routes
export const routes: RouteConfig[] = [...publicRoutes, ...protectedRoutes];
