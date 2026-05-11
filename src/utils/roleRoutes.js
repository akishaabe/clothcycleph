export const getDashboardPathForRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "partner":
      return "/partner";
    default:
      return "/dashboard";
  }
};
