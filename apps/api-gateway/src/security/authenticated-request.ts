import { CorrelatedRequest } from '@northlane/shared';

export type AuthenticatedPrincipal = Readonly<{
  email: string;
  role: 'ADMIN' | 'USER';
  userId: string;
}>;

export type AuthenticatedRequest = CorrelatedRequest & {
  user?: AuthenticatedPrincipal;
};
