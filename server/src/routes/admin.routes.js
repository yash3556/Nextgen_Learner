const express = require("express");

const {
  createAdmin,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createTask,
  deleteTask,
  getAnalytics,
  getStudents,
  listAnnouncements,
  listAdminTasks,
  updateTask,
  // Mock Interview
  createMockInterview,
  listMockInterviews,
  updateMockInterview,
  deleteMockInterview,
  // Practice Module
  createPracticeModule,
  listPracticeModules,
  updatePracticeModule,
  deletePracticeModule,
  // Practice Plan
  createPracticePlan,
  listPracticePlans,
  deletePracticePlan,
  // Student Projects
  listStudentProjects,
  updateStudentProject,
  deleteStudentProject
} = require("../controllers/admin.controller");
const { requireAdmin, requireAuth, requireMainAdmin } = require("../middleware/requireAuth");

const router = express.Router();

// Existing routes
router.get("/admin/students", requireAuth, requireAdmin, getStudents);
router.get("/admin/analytics", requireAuth, requireAdmin, getAnalytics);
router.get("/admin/tasks", requireAuth, requireAdmin, listAdminTasks);
router.get("/admin/announcements", requireAuth, requireAdmin, listAnnouncements);
router.post("/admin/announcement", requireAuth, requireAdmin, createAnnouncement);
router.patch("/admin/announcement/:announcementId", requireAuth, requireAdmin, updateAnnouncement);
router.delete("/admin/announcement/:announcementId", requireAuth, requireAdmin, deleteAnnouncement);
router.post("/admin/task", requireAuth, requireAdmin, createTask);
router.patch("/admin/task/:taskId", requireAuth, requireAdmin, updateTask);
router.delete("/admin/task/:taskId", requireAuth, requireAdmin, deleteTask);
router.post("/create-admin", requireAuth, requireMainAdmin, createAdmin);

// Mock Interview routes
router.get("/admin/mock-interviews", requireAuth, requireAdmin, listMockInterviews);
router.post("/admin/mock-interview", requireAuth, requireAdmin, createMockInterview);
router.patch("/admin/mock-interview/:interviewId", requireAuth, requireAdmin, updateMockInterview);
router.delete("/admin/mock-interview/:interviewId", requireAuth, requireAdmin, deleteMockInterview);

// Practice Module routes
router.get("/admin/practice-modules", requireAuth, requireAdmin, listPracticeModules);
router.post("/admin/practice-module", requireAuth, requireAdmin, createPracticeModule);
router.patch("/admin/practice-module/:moduleId", requireAuth, requireAdmin, updatePracticeModule);
router.delete("/admin/practice-module/:moduleId", requireAuth, requireAdmin, deletePracticeModule);

// Practice Plan routes
router.get("/admin/practice-plans", requireAuth, requireAdmin, listPracticePlans);
router.post("/admin/practice-plan", requireAuth, requireAdmin, createPracticePlan);
router.delete("/admin/practice-plan/:planId", requireAuth, requireAdmin, deletePracticePlan);

// Student Project routes
router.get("/admin/student-projects", requireAuth, requireAdmin, listStudentProjects);
router.patch("/admin/student-project/:projectId", requireAuth, requireAdmin, updateStudentProject);
router.delete("/admin/student-project/:projectId", requireAuth, requireAdmin, deleteStudentProject);

module.exports = router;
