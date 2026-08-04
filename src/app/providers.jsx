// src/app/providers.jsx
'use client';

import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return (
    <SessionProvider basePath="/api/auth">
      {children}
    </SessionProvider>
  );
}