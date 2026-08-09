import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { IRootState } from "../store";
import { usePermission } from "../hooks";
import { useCurrentUser, useCheckLock } from "../hooks/useAuth";
import { storageUtil } from "../utils/storage";
import { hydrateAuth } from "../store/authSlice";
import Loader from "./Loader";

interface PrivateRouteProps {
    children: React.ReactNode;
    permissions?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
    children,
    permissions,
}) => {
    const location = useLocation();
    const dispatch = useDispatch();
    const [isInitialized, setIsInitialized] = useState(false);
    const { isAuthenticated, user, isLocked } = useSelector(
        (state: IRootState) => state.auth
    );
    const { hasAllPermissions } = usePermission();

    // Use React Query to fetch current user if token exists
    const { isLoading: isUserLoading } = useCurrentUser(
        !!storageUtil.getToken()
    );

    // Check lock status
    const { isLoading: isLockLoading } = useCheckLock(
        !!storageUtil.getToken() && isAuthenticated
    );

    useEffect(() => {
        // Hydrate auth state from storage on first load
        if (!isInitialized) {
            dispatch(hydrateAuth());
            setIsInitialized(true);
        }
    }, [dispatch, isInitialized]);

    // Show loading indicator while checking authentication and lock status
    if (!isInitialized || isUserLoading || isLockLoading) {
        return <Loader />;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        const redirectUrl = encodeURIComponent(
            location.pathname + location.search
        );
        return (
            <Navigate
                to={`/auth/login?redirect=${redirectUrl}`}
                state={{ from: location }}
                replace
            />
        );
    }

    // Redirect to lock screen if session is locked
    if (isLocked) {
        return <Navigate to="/auth/lock-screen" replace />;
    }

    // Check permissions if required
    if (permissions && permissions.length > 0) {
        if (!hasAllPermissions(permissions)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // Render the protected component
    return <>{children}</>;
};

export default PrivateRoute;
