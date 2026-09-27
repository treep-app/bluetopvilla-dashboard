import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Property, StaffUser } from '../types/hotel';
import { api } from '../services/api';
import { authService, clearAuthStorage, getAccessToken, type LoginResult, setAccessToken } from '../services/authService';
import { mapAuthUserToStaffUser } from '../services/mapAuthUser';

interface HotelContextType {
  currentUser: StaffUser | null;
  authReady: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  /** First-run setup: creates the first super administrator and signs them in. */
  completeSetup: (body: { email: string; firstName: string; lastName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Clears the session locally when the API rejects the token. */
  expireSession: () => void;
  hasPermission: (permission: keyof StaffUser['permissions']) => boolean;

  /** Hotel settings from the backend (name, currency, timezone, check-in times). */
  property: Property | null;

  /** Bumped after every successful mutation so all mounted views reload from the API. */
  dataVersion: number;
  refresh: () => void;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Restore the JWT session on load.
  useEffect(() => {
    // Drop mock data persisted by earlier dashboard versions.
    ['btv_rooms', 'btv_reservations', 'btv_pricing', 'btv_notifications', 'btv_alerts'].forEach((key) =>
      localStorage.removeItem(key),
    );
    let cancelled = false;
    const restoreSession = async () => {
      if (!getAccessToken()) {
        clearAuthStorage();
        if (!cancelled) setAuthReady(true);
        return;
      }
      try {
        const profile = await authService.me();
        if (!cancelled) setCurrentUser(mapAuthUserToStaffUser(profile));
      } catch {
        clearAuthStorage();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    api
      .property()
      .then((value) => !cancelled && setProperty(value))
      .catch(() => !cancelled && setProperty(null));
    return () => {
      cancelled = true;
    };
  }, [currentUser, dataVersion]);

  const startSession = (result: LoginResult) => {
    setAccessToken(result.accessToken);
    setCurrentUser(mapAuthUserToStaffUser(result.user));
  };

  const loginWithCredentials = async (email: string, password: string) => {
    startSession(await authService.login(email, password));
  };

  const completeSetup = async (body: { email: string; firstName: string; lastName: string; password: string }) => {
    startSession(await authService.setup(body));
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const expireSession = useCallback(() => {
    clearAuthStorage();
    setCurrentUser(null);
  }, []);

  const refresh = useCallback(() => setDataVersion((version) => version + 1), []);

  const hasPermission = (permission: keyof StaffUser['permissions']) =>
    Boolean(currentUser?.permissions[permission]);

  return (
    <HotelContext.Provider
      value={{
        currentUser,
        authReady,
        loginWithCredentials,
        completeSetup,
        logout,
        expireSession,
        hasPermission,
        property,
        dataVersion,
        refresh,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) throw new Error('useHotel must be used within a HotelProvider');
  return context;
};
