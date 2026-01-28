"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { UserProvider } from "../utils/user";
import AppLayout from "./AppLayout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={clientId}>
          <React.StrictMode>
            <UserProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </UserProvider>
          </React.StrictMode>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
