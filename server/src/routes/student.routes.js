const express = require("express");

const {
  getAnnouncements,
  getStudentDashboard,
  requestMockInterview,
  getMockInterviews,
  getPracticeModules,
  getPracticePlans,
  getPracticeTaskSubmissions,
  submitPracticeTaskSubmission,
  getMyProjects,
  createProject,
  updateProject,
  deleteProject
} = require("../controllers/student.controller");
const { requireAuth, requireStudent } = require("../middleware/requireAuth");

const router = express.Router();

// Existing routes
router.get("/student/dashboard", requireAuth, requireStudent, getStudentDashboard);
router.get("/announcements", requireAuth, getAnnouncements);
router.post("/student/interview-request", requireAuth, requireStudent, requestMockInterview);

// New routes for admin-created content
router.get("/mock-interviews", requireAuth, requireStudent, getMockInterviews);
router.get("/practice-modules", requireAuth, requireStudent, getPracticeModules);
router.get("/practice-plans", requireAuth, requireStudent, getPracticePlans);
router.get("/practice-task-submissions", requireAuth, requireStudent, getPracticeTaskSubmissions);
router.post("/practice-task-submission", requireAuth, requireStudent, submitPracticeTaskSubmission);

// Student Projects
router.get("/projects", requireAuth, requireStudent, getMyProjects);
router.post("/project", requireAuth, requireStudent, createProject);
router.patch("/project/:projectId", requireAuth, requireStudent, updateProject);
router.delete("/project/:projectId", requireAuth, requireStudent, deleteProject);

module.exports = router;
