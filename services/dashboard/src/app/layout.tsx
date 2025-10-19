import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/graphql';
import { ClientApolloProvider } from '@/components/ClientApolloProvider';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Optimize font loading
});

export const metadata: Metadata = {
  title: "MasterFabric Dashboard",
  description: "Multi-tenant BaaS Platform Dashboard",
  keywords: ["BaaS", "Multi-tenant", "Dashboard", "MasterFabric"],
  authors: [{ name: "MasterFabric Team" }],
  robots: "index, follow",
  other: {
    "masterfabric-license": "AGPL-3.0",
    "masterfabric-repository": "https://github.com/masterfabric/masterfabric",
    "masterfabric-company": "MASTERFABRIC Information Technologies Inc.",
    "masterfabric-author": "@gurkanfikretgunak",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClientApolloProvider>
          {children}
        </ClientApolloProvider>
      </body>
    </html>
  );
}
