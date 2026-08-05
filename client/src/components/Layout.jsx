import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg">
      <Sidebar />

      <div className="lg:pl-72">
        <div className="relative min-h-screen px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="pointer-events-none absolute left-0 top-0 -z-0 h-64 w-64 rounded-full bg-[#E6F0EB]/80 blur-3xl dark:bg-[#1E332C]/60" />
          <div className="pointer-events-none absolute right-0 top-12 -z-0 h-72 w-72 rounded-full bg-[#EDF0E7]/80 blur-3xl dark:bg-[#1F2824]/60" />
          <main key={location.pathname} className="relative z-10 animate-fade-in-up">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
