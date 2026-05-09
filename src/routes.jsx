import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./app/pages/LandingPage";
import { LoginPage } from "./app/pages/LoginPage";
import { SignUpPage } from "./app/pages/SignUpPage";
import { UserDashboard } from "./app/pages/UserDashboard";
import { AdminDashboard } from "./app/pages/AdminDashboard";
import { PartnerDashboard } from "./app/pages/PartnerDashboard";
import { SettingsPage } from "./app/pages/SettingsPage";
import { SubmissionFormPage } from "./app/pages/SubmissionFormPage";
import { FloatingPageControls } from "./app/components/FloatingPageControls";
import { LegalDocumentPage } from "./app/pages/LegalDocumentPage";
import { NotificationsPage } from "./app/pages/NotificationsPage";

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
    path: "/partner",
    Component: withPageControls(PartnerDashboard),
  },
  {
    path: "/admin",
    Component: withPageControls(AdminDashboard),
  },
  {
    path: "/settings",
    Component: withPageControls(SettingsPage),
  },
  {
    path: "/submit",
    Component: withPageControls(SubmissionFormPage),
  },
  {
    path: "/terms",
    Component: withPageControls(() => <LegalDocumentPage type="terms" />),
  },
  {
    path: "/privacy",
    Component: withPageControls(() => <LegalDocumentPage type="privacy" />),
  },
  {
    path: "/notifications",
    Component: withPageControls(NotificationsPage),
  },
]);
