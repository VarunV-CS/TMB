
import express from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  replaceTasks,
  getTaskStats,
  // V2 endpoints with virtual population
  getTasksV2,
  getTaskByIdV2,
  getUserTasksV2,
  getTasksWithStatsV2
} from "../controllers/taskController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// V1 Routes (Original - no populate)
router.get('/', getTasks);                              // GET all tasks
router.get('/stats', getTaskStats);                     // GET task statistics
router.get('/:id', getTaskById);                        // GET single task
router.post('/', createTask);                           // POST create task
router.put('/:id', updateTask);                         // PUT update task
router.delete('/:id', deleteTask);                      // DELETE task
router.put('/', replaceTasks);                          // PUT replace all tasks

// V2 Routes (New - with Virtual Population)
// Query parameter versioning - v2
router.get('/', (req, res) => {
  if (req.query.v === '2') {
    return getTasksV2(req, res);
  }
  return getTasks(req, res);
});

router.get('/:id', (req, res) => {
  if (req.query.v === '2') {
    return getTaskByIdV2(req, res);
  }
  return getTaskById(req, res);
});

// Explicit v2 endpoints
router.get('/v2/all', getTasksV2);                      // GET all tasks with populate
router.get('/v2/:id', getTaskByIdV2);                   // GET single task with populate
router.get('/v2/user/:userId', getUserTasksV2);         // GET user tasks with populate
router.get('/v2/with-stats', getTasksWithStatsV2);      // GET tasks with stats and populate

export default router;

