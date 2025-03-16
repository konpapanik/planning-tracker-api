require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { body, param, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Middleware to validate JWT authentication
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "defaultSecretKey");
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// GET all applications
app.get("/applications", async (req, res) => {
  try {
    const applications = await prisma.application.findMany();
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST Create new application
app.post(
  "/applications",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("status")
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Status must be 'pending', 'approved', or 'rejected'"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { title, description, status } = req.body;
      const newApp = await prisma.application.create({ data: { title, description, status } });
      res.status(201).json(newApp);
    } catch (error) {
      res.status(500).json({ error: "Could not create application" });
    }
  }
);

// PUT Update application
app.put(
  "/applications/:id",
  [
    param("id").isInt().withMessage("ID must be an integer"),
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("description").optional().notEmpty().withMessage("Description cannot be empty"),
    body("status")
      .optional()
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const { title, description, status } = req.body;
      const updatedApp = await prisma.application.update({
        where: { id: parseInt(id) },
        data: { title, description, status },
      });
      res.json(updatedApp);
    } catch (error) {
      res.status(500).json({ error: "Could not update application" });
    }
  }
);

// DELETE Application
app.delete(
  "/applications/:id",
  [param("id").isInt().withMessage("ID must be an integer")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      await prisma.application.delete({ where: { id: parseInt(id) } });
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Could not delete application" });
    }
  }
);

// POST Register User
app.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({ data: { name, email, password: hashedPassword } });
      res.status(201).json({ message: "User registered successfully", userId: newUser.id });
    } catch (error) {
      res.status(500).json({ error: "User already exists" });
    }
  }
);

// POST Login User
app.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "defaultSecretKey", {
        expiresIn: "1h",
      });
      res.json({ message: "Login successful", token });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Export app for Jest Testing (CI/CD)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

module.exports = app;