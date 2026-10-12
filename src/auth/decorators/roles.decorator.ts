import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe un resolver a ciertos roles. Se compara contra `role.key` y
 * `role.roleName`, así que sirve tanto `admin` como `administrador`.
 * Requiere `JwtAuthGuard` antes que `RolesGuard`.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
