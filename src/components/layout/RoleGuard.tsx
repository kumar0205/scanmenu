import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

const ROLE_HOME: Record<string, string> = {
  chef:       '/admin/kitchen',
  waiter:     '/admin/orders',
  owner:      '/admin/dashboard',
  superAdmin: '/admin/dashboard',
};

interface RoleGuardProps {
  allowedRoles: string[];
}

/**
 * RoleGuard wraps route groups and redirects unauthorized roles to their
 * home page rather than showing a 404 or blank screen.
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { userRole } = useAuthContext();

  // If role is allowed (or no role restriction), render child routes
  if (!userRole || allowedRoles.includes(userRole)) {
    return <Outlet />;
  }

  // Redirect to the role's home route
  const home = ROLE_HOME[userRole] ?? '/login';
  return <Navigate to={home} replace />;
}
