import express from "express";
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  login,
  register,
  getMe,
  logout
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', login);
router.post('/register', register);

// Protected routes (authentication required)
router.get("/", auth, getUsers);
router.get("/me", auth, getMe);
router.get("/:id", auth, getUserById);
router.post('/createUser', auth, createUser);
router.put('/updateUser/:id', auth, updateUser);
router.delete('/deleteUser/:id', auth, deleteUser);
router.post('/logout', auth, logout);

export default router;

