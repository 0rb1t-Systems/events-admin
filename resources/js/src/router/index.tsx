import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import BlankLayout from "../layouts/BlankLayout";
import DefaultLayout from "../layouts/DefaultLayout";
import { routes } from "./routes";
import PrivateRoute from "../components/PrivateRoute";
import Error500 from "../components/errors/Error500";
import Loader from "../components/Loader";

// Loading component for Suspense fallback
const Loading = () => (
    <div className="relative h-[80vh]">
        <Loader fullScreen={false} text="Loading..." />
    </div>
);

const finalRoutes = routes.map((route) => {
    // Create the layout wrapper based on the layout type
    const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
        return route.layout === "blank" ? (
            <BlankLayout>{children}</BlankLayout>
        ) : (
            <DefaultLayout>{children}</DefaultLayout>
        );
    };

    // Add Suspense for lazy loading
    const ElementWithSuspense = (
        <Suspense fallback={<Loading />}>{route.element}</Suspense>
    );

    // Determine if the route needs authentication protection
    const routeElement = route.isPublic ? (
        <LayoutWrapper>{ElementWithSuspense}</LayoutWrapper>
    ) : (
        <PrivateRoute permissions={route.permissions}>
            <LayoutWrapper>{ElementWithSuspense}</LayoutWrapper>
        </PrivateRoute>
    );

    return {
        ...route,
        element: routeElement,
        errorElement: (
            <BlankLayout>{route.errorElement || <Error500 />}</BlankLayout>
        ),
    };
});

const router = createBrowserRouter(finalRoutes);

export default router;
