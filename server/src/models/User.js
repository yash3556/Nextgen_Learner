const mongoose = require("mongoose");

const roadmapSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    title: { type: String, default: "" },
    duration: { type: String, default: "" },
    difficulty: { type: String, default: "" },
    source: { type: String, default: "custom" },
    idea: { type: String, default: "" },
    tasks: { type: [String], default: [] },
    startedOn: { type: String, default: "" }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, trim: true, unique: true, sparse: true },
    password: { type: String, default: "", select: false },
    role: { type: String, enum: ["student", "admin"], default: "student", index: true },
    isMainAdmin: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },

    college: { type: String, default: "" },
    course: { type: String, default: "" },
    cgpa: { type: String, default: "" },

    technicalSkills: { type: [String], default: [] },
    nonTechnicalSkills: { type: [String], default: [] },
    interests: { type: [String], default: [] },

    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    goals: { type: [String], default: [] },
    learningMode: { type: String, enum: ["fast", "deep", "practical"], default: "deep" },
    headline: { type: String, default: "" },
    githubUrl: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    resumeSummary: { type: String, default: "" },
    resumeTemplate: { type: String, default: "modern" },

    activeRoadmap: { type: roadmapSchema, default: null },
    customRoadmaps: { type: [roadmapSchema], default: [] }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("User", userSchema);

