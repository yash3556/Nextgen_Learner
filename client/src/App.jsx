import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Roadmaps from "./pages/Roadmaps";
import AITeacher from "./pages/AITeacher";
import Tasks from "./pages/Tasks";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import RoadmapDetail from "./pages/RoadmapDetail";
import Practice from "./pages/Practice";
import MockInterview from "./pages/MockInterview";
import Projects from "./pages/Projects";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Navigate to="/student-dashboard" replace />} />

        <Route element={<RequireAuth allowedRoles={["admin"]} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["student"]} />}>
          <Route element={<Layout />}>
            <Route path="/student-dashboard" element={<Dashboard />} />
            <Route path="/roadmaps" element={<Roadmaps />} />
            <Route path="/roadmaps/:id" element={<RoadmapDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/mock-interview" element={<MockInterview />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai-teacher" element={<AITeacher />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
