export function getHomePathForRole(role) {
  return role === "admin" ? "/admin-dashboard" : "/student-dashboard";
}
