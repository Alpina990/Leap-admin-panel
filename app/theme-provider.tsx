"use client";

import {ThemeProvider} from 'next-themes';
import type {ReactNode} from 'react';

export default function AppearanceProvider({children}: {children: ReactNode}) {
  return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="leap-theme" disableTransitionOnChange>{children}</ThemeProvider>;
}
