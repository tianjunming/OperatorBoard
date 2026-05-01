import { useAuth } from '../context/AuthContext';

/**
 * PermissionGuard - Declarative permission control component
 *
 * @example
 * // Single permission check
 * <PermissionGuard permissions="system:user:create" fallback={<NoAccess />}>
 *   <CreateButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (all required)
 * <PermissionGuard permissions={['system:user:list', 'system:user:update']} requireAll>
 *   <EditButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (any one sufficient)
 * <PermissionGuard permissions={['admin', 'manager']} requireAny>
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * // Role check
 * <PermissionGuard roles="admin">
 *   <AdminPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permissions = null,
  roles = null,
  requireAll = false,
  requireAny = false,
  fallback = null
}) {
  const { hasPermission, hasRole, isSuperuser } = useAuth();

  // Superuser has all permissions
  if (isSuperuser) {
    return children;
  }

  // Role check
  if (roles !== null) {
    const roleList = Array.isArray(roles) ? roles : [roles];
    if (requireAny) {
      if (!roleList.some(role => hasRole(role))) {
        return fallback;
      }
    } else {
      if (!roleList.every(role => hasRole(role))) {
        return fallback;
      }
    }
    // If only role check, return children after role passes
    if (permissions === null) {
      return children;
    }
  }

  // Permission check
  if (permissions !== null) {
    const permList = Array.isArray(permissions) ? permissions : [permissions];

    if (requireAll) {
      if (!permList.every(perm => hasPermission(perm))) {
        return fallback;
      }
    } else {
      // requireAny is the default behavior (any one is enough)
      if (!permList.some(perm => hasPermission(perm))) {
        return fallback;
      }
    }
  }

  return children;
}

export default PermissionGuard;
