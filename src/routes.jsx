import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./app/pages/LandingPage";
import { LoginPage } from "./app/pages/LoginPage";
import { SignUpPage } from "./app/pages/SignUpPage";
import { UserDashboard } from "./app/pages/UserDashboard";
import { AdminDashboard } from "./app/pages/AdminDashboard";
import { SuperAdminDashboard } from "./app/pages/SuperAdminDashboard";
import { SettingsPage } from "./app/pages/SettingsPage";
import { SubmissionFormPage } from "./app/pages/SubmissionFormPage";
import { FloatingPageControls } from "./app/components/FloatingPageControls";

const withPageControls = (Page) => {
  return function PageWithControls() {
    return (
      <>
        <Page />
        <FloatingPageControls />
      </>
    );
  };
};

export const router = createBrowserRouter([
  {
    path: "/",
    Component: withPageControls(LandingPage),
  },
  {
    path: "/login",
    Component: withPageControls(LoginPage),
  },
  {
    path: "/signup",
    Component: withPageControls(SignUpPage),
  },
  {
    path: "/dashboard",
    Component: withPageControls(UserDashboard),
  },
  {
    path: "/admin",
    Component: withPageControls(AdminDashboard),
  },
  {
    path: "/super-admin",
    Component: withPageControls(SuperAdminDashboard),
  },
  {
    path: "/settings",
    Component: withPageControls(SettingsPage),
  },
  {
    path: "/submit",
    Component: withPageControls(SubmissionFormPage),
  },
]);
