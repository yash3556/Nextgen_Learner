import {
  LayoutDashboard,
  Map,
  ListChecks,
  Target,
  Mic,
  FolderKanban,
  Users,
  UserRound,
  GraduationCap,
  ClipboardList,
  CalendarCheck2,
  Megaphone,
  UsersRound,
  ChartColumnIncreasing,
  Settings
} from "lucide-react";

export const studentNavigation = [
  { to: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmaps", label: "My Roadmap", icon: Map },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/practice", label: "Practice", icon: Target },
  { to: "/mock-interview", label: "Mock Interview", icon: Mic },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/community", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: UserRound }
];

export const adminNavigation = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: GraduationCap },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "sessions", label: "Sessions", icon: CalendarCheck2 },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "groups", label: "Groups", icon: UsersRound },
  { id: "analytics", label: "Analytics", icon: ChartColumnIncreasing },
  { id: "admin-access", label: "Admin Access", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings }
];
