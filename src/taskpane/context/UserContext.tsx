// src/taskpane/context/UserContext.tsx

import * as React from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { authService, ILicense } from '../services/AuthService';

/**
 * Defines the shape of the data that the UserContext will provide.
 * It's important to include an isLoading flag so that downstream components
 * can intelligently handle the initial, asynchronous license fetch.
 */
interface IUserContext {
  license: ILicense | null;
  isLoading: boolean;
}

// 1. Create the React Context object with a default value.
// We start with `undefined` to allow for a runtime check in our custom hook.
const UserContext = createContext<IUserContext | undefined>(undefined);

/**
 * The Provider component that will wrap our application.
 * It is responsible for fetching the user's license via the AuthService
 * and making it available to all child components through the context.
 */
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [license, setLicense] = useState<ILicense | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Use a useEffect hook that runs once when the component is first mounted.
  useEffect(() => {
    // This is an async operation, which is why the loading state is crucial.
    const fetchLicense = async () => {
      try {
        const userLicense = await authService.getVerifiedLicense();
        setLicense(userLicense);
      } catch (error) {
        // If the service fails for any reason, we default to a "null" license,
        // which the application should treat as a 'free' or unauthenticated state.
        console.error("Failed to fetch license:", error);
        setLicense(null); 
      } finally {
        // No matter the outcome, the loading process is complete.
        setIsLoading(false);
      }
    };

    fetchLicense();
  }, []); // The empty dependency array [] ensures this effect runs only on mount.

  // The value object is memoized by React by default. It will only be re-created
  // if `license` or `isLoading` changes, triggering a re-render in consumers.
  const value = { license, isLoading };

  // 3. Render the context provider, passing down the license and loading state.
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

/**
 * A custom hook to simplify accessing the UserContext.
 * This is the preferred way for components to consume the context value.
 * It also provides a helpful error message if used outside of a UserProvider.
 */
export const useUser = (): IUserContext => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};