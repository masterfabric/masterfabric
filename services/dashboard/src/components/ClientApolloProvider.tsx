'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/graphql';

interface ClientApolloProviderProps {
  children: React.ReactNode;
}

export function ClientApolloProvider({ children }: ClientApolloProviderProps) {
  // Only render Apollo Provider on client-side
  if (typeof window === 'undefined' || !apolloClient) {
    return <>{children}</>;
  }

  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}
