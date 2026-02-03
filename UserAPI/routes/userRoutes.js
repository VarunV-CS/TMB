
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
  logout,
  // V2 endpoints with virtual population
  getUsersWithTasksV2,
  getUserByIdV2,
  getMeV2,
  getUserWithTaskSummaryV2
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

// V2 Routes (New - with Virtual Population)

// Query parameter versioning - ?v=2
router.get('/me', (req, res) => {
  if (req.query.v === '2') {
    return getMeV2(req, res);
  }
  return getMe(req, res);
});

router.get('/:id', (req, res) => {
  if (req.query.v === '2') {
    return getUserByIdV2(req, res);
  }
  return getUserById(req, res);
});

// Explicit v2 endpoints
router.get('/v2/all', auth, getUsersWithTasksV2);                         // GET all users with populated tasks
router.get('/v2/me', auth, getMeV2);                                       // GET current user with tasks
router.get('/v2/:id', auth, getUserByIdV2);                               // GET user with populated tasks
router.get('/v2/me/summary', auth, getUserWithTaskSummaryV2);             // GET current user with task summary
router.get('/v2/:id/summary', auth, getUserWithTaskSummaryV2);            // GET user with task summary

export default router;

