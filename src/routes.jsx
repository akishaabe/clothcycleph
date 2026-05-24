import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { FloatingPageControls } from "./app/components/FloatingPageControls";
import { ProtectedRoute } from "./app/components/ProtectedRoute";
import { BrandLoadingScreen } from "./app/components/BrandLoadingScreen";

const lazyPage = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const LandingPage = lazyPage(() => import("./app/pages/LandingPage"), "LandingPage");
const LoginPage = lazyPage(() => import("./app/pages/LoginPage"), "LoginPage");
const SignUpPage = lazyPage(() => import("./app/pages/SignUpPage"), "SignUpPage");
const UserDashboard = lazyPage(() => import("./app/pages/UserDashboard"), "UserDashboard");
const AdminDashboard = lazyPage(() => import("./app/pages/AdminDashboard"), "AdminDashboard");
const AdminDeletedRecordsPage = lazyPage(() => import("./app/pages/AdminDeletedRecordsPage"), "AdminDeletedRecordsPage");
const PartnerDashboard = lazyPage(() => import("./app/pages/PartnerDashboard"), "PartnerDashboard");
const SettingsPage = lazyPage(() => import("./app/pages/SettingsPage"), "SettingsPage");
const SubmissionFormPage = lazyPage(() => import("./app/pages/SubmissionFormPage"), "SubmissionFormPage");
const LegalDocumentPage = lazyPage(() => import("./app/pages/LegalDocumentPage"), "LegalDocumentPage");
const NotificationsPage = lazyPage(() => import("./app/pages/NotificationsPage"), "NotificationsPage");
const MessagesPage = lazyPage(() => import("./app/pages/MessagesPage"), "MessagesPage");
const DssConfirmationPage = lazyPage(() => import("./app/pages/DssConfirmationPage"), "DssConfirmationPage");
const DssRequestsPage = lazyPage(() => import("./app/pages/DssRequestsPage"), "DssRequestsPage");
const SubmittedRequestsPage = lazyPage(() => import("./app/pages/SubmittedRequestsPage"), "SubmittedRequestsPage");

const withPageControls = (Page, props) => {
  return function PageWithControls() {
    return (
      <Suspense
        fallback={
          <BrandLoadingScreen
            title="Loading ClothCycle"
            message="Preparing your module..."
            detail="Your route is protected and loading with the current account context."
          />
        }
      >
        <Page {...props} />
        <FloatingPageControls />
      </Suspense>
    );
  };
};

const protectedPage = (Page, roles) => {
  const PageWithControls = withPageControls(Page);

  return function ProtectedPageWithControls() {
    return (
      <ProtectedRoute roles={roles}>
        <PageWithControls />
      </ProtectedRoute>
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
    Component: protectedPage(UserDashboard, ["user"]),
  },
  {
    path: "/partner",
    Component: protectedPage(PartnerDashboard, ["partner"]),
  },
  {
    path: "/admin",
    Component: protectedPage(AdminDashboard, ["admin"]),
  },
  {
    path: "/admin/deleted-records",
    Component: protectedPage(AdminDeletedRecordsPage, ["admin"]),
  },
  {
    path: "/settings",
    Component: protectedPage(SettingsPage, ["user", "partner", "admin"]),
  },
  {
    path: "/submit",
    Component: protectedPage(SubmissionFormPage, ["user"]),
  },
  {
    path: "/dss/:submissionId",
    Component: protectedPage(DssConfirmationPage, ["user"]),
  },
  {
    path: "/dss-requests",
    Component: protectedPage(DssRequestsPage, ["user"]),
  },
  {
    path: "/my-requests",
    Component: protectedPage(SubmittedRequestsPage, ["user"]),
  },
  {
    path: "/terms",
    Component: withPageControls(LegalDocumentPage, { type: "terms" }),
  },
  {
    path: "/privacy",
    Component: withPageControls(LegalDocumentPage, { type: "privacy" }),
  },
  {
    path: "/notifications",
    Component: protectedPage(NotificationsPage, ["user", "partner", "admin"]),
  },
  {
    path: "/messages",
    Component: protectedPage(MessagesPage, ["user", "partner", "admin"]),
  },
]);
