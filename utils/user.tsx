"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { mockUser } from "@/test/mockUser";

export interface User {
    sub: string;
    email: string;
    firstName?: string;
    lastName?: string;
    dob: string; 
    profile_img_url?: string | null;
    profile_name: string;
    created_at?: string | Date | null;
    updated_at?: string | Date | null;
    last_login?: string | Date | null;
    status?: string;
    status_created_on?: string | Date | null;
    provider?: string;
    provider_sub?: string | null;
}

interface UserContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    refreshUser: () => Promise<User | null>;
    loading: boolean;
    setHasAttemptedAuth: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasAttemptedAuth, setHasAttemptedAuth] = useState<boolean>(false);

    const refreshUser = async (): Promise<User | null> => {

        setLoading(true);
        try {
            const res = await fetch("https://api.gomeal.org/auth/user", {
                method: "GET",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok && data.authenticated) {
                setUser(data.user);
                return data.user;
            }

            if (res.status === 401 && data.shouldRefresh) {
                const refreshRes = await fetch("https://api.gomeal.org/auth/refresh", {
                    method: "POST",
                    credentials: "include",
                });
                const refreshData = await refreshRes.json();
                if (refreshData.user) {
                    setUser(refreshData.user);
                    return refreshData.user;
                }
            }

            setUser(null);
            return null;
        } catch (err) {
            console.error("[UserProvider] refreshUser error:", err);
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (process.env.NEXT_PUBLIC_DEV === "true") {
            setUser(mockUser);
            setLoading(false);
            console.log("mock user", mockUser)
        } else if (hasAttemptedAuth) {
            refreshUser();
        }
    }, [hasAttemptedAuth]);

    return (
        <UserContext.Provider value={{ user, setUser, refreshUser, loading, setHasAttemptedAuth }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        return {
            user: null,
            loading: false,
            setUser: () => {},
            refreshUser: async () => null,
            setHasAttemptedAuth: () => {},
        };
    }
    return context;
};

