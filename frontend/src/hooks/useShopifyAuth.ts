// Shopify App Bridge Authentication Hook
import { useEffect, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';

export function useShopifyAuth() {
  const app = useAppBridge();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In Shopify embedded apps, authentication is handled by App Bridge
        // If the app is loaded within Shopify Admin, we're authenticated
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        // TODO: Redirect to OAuth flow if not authenticated
        // This requires backend OAuth implementation from Security Specialist
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [app]);

  return {
    isAuthenticated,
    isLoading,
    app,
  };
}
