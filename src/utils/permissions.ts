import type { User, UserRole } from '../types';

/**
 * Roles allowed to assign / change a schedule's crew (lead + support photographers).
 * Superadmin & Admin for now; the upcoming "Điều phối" (coordinator) role will be added here.
 * Keep in sync with backend/src/utils/permissions.ts.
 */
export const CREW_EDITOR_ROLES: readonly UserRole[] = [0, 1];

export const canEditCrew = (user: Pick<User, 'roles'> | null | undefined): boolean =>
  !!user?.roles?.some((r) => CREW_EDITOR_ROLES.includes(r));

export const CREW_EDITOR_HINT = 'Quản trị viên sẽ phân công ekip';

/**
 * Sale collaborator (even when also Sale): only sees classes they created / are assigned,
 * no income/expense. Admins are never restricted. Keep in sync with backend/src/utils/permissions.ts.
 */
export const isSaleCollaborator = (user: Pick<User, 'roles'> | null | undefined): boolean =>
  !!user?.roles?.includes(4) && !user.roles.some((r) => r === 0 || r === 1);
