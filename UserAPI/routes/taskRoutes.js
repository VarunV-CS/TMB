
import express from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  replaceTasks,
  getTaskStats
} from "../controllers/taskController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Task CRUD operations
router.get('/', getTasks);                              // GET all tasks
router.get('/stats', getTaskStats);                     // GET task statistics
router.get('/:id', getTaskById);                        // GET single task
router.post('/', createTask);                           // POST create task
router.put('/:id', updateTask);                         // PUT update task
router.delete('/:id', deleteTask);                      // DELETE task
router.put('/', replaceTasks);                          // PUT replace all tasks

export default router;

