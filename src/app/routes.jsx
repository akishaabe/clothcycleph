import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { UserDashboard } from "./pages/UserDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { SettingsPage } from "./pages/SettingsPage";
import { SubmissionFormPage } from "./pages/SubmissionFormPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignUpPage,
  },
  {
    path: "/dashboard",
    Component: UserDashboard,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/super-admin",
    Component: SuperAdminDashboard,
  },
  {
    path: "/settings",
    Component: SettingsPage,
  },
  {
    path: "/submit",
    Component: SubmissionFormPage,
  },
]);
