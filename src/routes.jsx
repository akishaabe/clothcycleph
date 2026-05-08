import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./app/pages/LandingPage";
import { LoginPage } from "./app/pages/LoginPage";
import { SignUpPage } from "./app/pages/SignUpPage";
import { UserDashboard } from "./app/pages/UserDashboard";
import { AdminDashboard } from "./app/pages/AdminDashboard";
import { SuperAdminDashboard } from "./app/pages/SuperAdminDashboard";
import { SettingsPage } from "./app/pages/SettingsPage";
import { SubmissionFormPage } from "./app/pages/SubmissionFormPage";

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
