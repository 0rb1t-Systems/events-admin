import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { hydrateAuth } from '../store/authSlice';
import { useCurrentUser } from './useAuth';
import { storageUtil } from '../utils/storage';

/**
 * Hook to initialize authentication state on app startup
 */
export const useAuthInit = () => {
  const dispatch = useDispatch();

  // Check if we have a token to fetch user data
  const hasToken = !!storageUtil.getToken();

  // Fetch current user if token exists
  const { isLoading, error } = useCurrentUser(hasToken);

  useEffect(() => {
    // Hydrate auth state from storage on app startup
    dispatch(hydrateAuth());
  }, [dispatch]);

  return {
    isInitializing: hasToken ? isLoading : false,
    initError: error,
  };
};
