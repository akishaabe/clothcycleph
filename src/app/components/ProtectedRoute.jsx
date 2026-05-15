import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDashboardPathForRole } from "../../utils/roleRoutes";

export function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const userRole = String(user?.role || "").toLowerCase();
  const allowedRoles = roles?.map((role) => String(role).toLowerCase()) || [];

  if (isLoading) {
    return (
      <div className="app-darkable-page flex min-h-screen items-center justify-center bg-[#f7faf5] text-[#19221d]">
        <div className="rounded-2xl border border-[#dce7d9] bg-white px-6 py-4 shadow-sm">
          Checking your ClothCycle session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length && !allowedRoles.includes(userRole)) {
    return <Navigate to={getDashboardPathForRole(userRole)} replace />;
  }

  return children;
}
