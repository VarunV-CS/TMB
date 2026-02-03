import Task from "../models/Task.js";
import User from "../models/User.js";
import { sendTaskCreatedEmail } from "../services/emailService.js";

// GET all tasks for the authenticated user
export const getTasks = async (req, res) => {
  try {
    const { status, priority, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query filter
    const filter = { userId: req.user.id };
    
    if (status !== undefined) {
      filter.status = status;
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    
    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const tasks = await Task.find(filter)
      .sort(sortOptions)
      .select('-userId'); // Exclude userId from response
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// GET single task by ID
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('-userId');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching task' });
  }
};

// POST create new task
export const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }
    
    const trimmedTitle = title.trim();
    
    // Check if a task with the same name already exists for this user
    const existingTask = await Task.findOne({ 
      userId: req.user.id, 
      title: { $regex: new RegExp(`^${trimmedTitle}$`, 'i') }
    });
    
    if (existingTask) {
      return res.status(400).json({ message: 'A task with this name already exists' });
    }
    
    const task = new Task({
      userId: req.user.id,
      title: trimmedTitle,
      description: description ? description.trim() : '',
      priority: priority || 'medium',
      dueDate: dueDate || null
    });

    await task.save();

    // Prepare response task without userId
    const responseTask = task.toObject();
    delete responseTask.userId;

    // Send email notification to user (non-blocking)
    try {
      const user = await User.findById(req.user.id);
      if (user && user.Email) {
        sendTaskCreatedEmail(user, responseTask);
      }
    } catch (emailError) {
      // Log but don't fail - email is non-blocking
      console.error('Failed to send task notification email:', emailError.message);
    }

    res.status(201).json({
      success: true,
      task: responseTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Create task error:', error);
    // Handle duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A task with this name already exists' });
    }
    res.status(500).json({ message: 'Server error while creating task' });
  }
};

// PUT update task
export const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    
    // Build update object with only provided fields
    const updateData = { updatedAt: new Date() };
    
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Task title cannot be empty' });
      }
      updateData.title = title.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    
    if (status !== undefined) {
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be pending, in_progress, or completed' });
      }
      updateData.status = status;
    }
    
    if (priority !== undefined) {
      updateData.priority = priority;
    }
    
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate;
    }
    
    // If title is being updated, check for duplicates
    if (updateData.title) {
      const existingTask = await Task.findOne({
        userId: req.user.id,
        title: { $regex: new RegExp(`^${updateData.title}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingTask) {
        return res.status(400).json({ message: 'A task with this name already exists' });
      }
    }
    
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    ).select('-userId');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({
      success: true,
      task,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    // Handle duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A task with this name already exists' });
    }
    res.status(500).json({ message: 'Server error while updating task' });
  }
};

// DELETE task
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
};

// PUT bulk update tasks (replace all)
export const replaceTasks = async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ message: 'Tasks must be an array' });
    }
    
    // Delete all existing tasks for user
    await Task.deleteMany({ userId: req.user.id });
    
    // Create new tasks with proper structure
    const newTasks = tasks.map(task => ({
      userId: req.user.id,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || null,
      createdAt: task.createdAt || new Date(),
      updatedAt: new Date()
    }));
    
    // Insert all new tasks
    const insertedTasks = await Task.insertMany(newTasks);
    
    // Return without userId
    const responseTasks = insertedTasks.map(task => {
      const obj = task.toObject();
      delete obj.userId;
      return obj;
    });
    
    res.json({
      success: true,
      tasks: responseTasks,
      message: 'Tasks updated successfully'
    });
  } catch (error) {
    console.error('Replace tasks error:', error);
    res.status(500).json({ message: 'Server error while updating tasks' });
  }
};

// GET task statistics for user
export const getTaskStats = async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    };
    
    res.json({
      totalTasks: result.total,
      pendingTasks: result.pending,
      inProgressTasks: result.inProgress,
      completedTasks: result.completed,
      highPriorityCount: result.highPriority,
      mediumPriorityCount: result.mediumPriority,
      lowPriorityCount: result.lowPriority
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ message: 'Server error while fetching task statistics' });
  }
};

// V2 ENDPOINTS - With Virtual Population
// GET all tasks with populated user details (Method 1: Virtual Population)
export const getTasksV2 = async (req, res) => {
  try {
    const { status, priority, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query filter
    const filter = { userId: req.user.id };

    if (status !== undefined) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // V2: With virtual population - includes createdBy user details
    const tasks = await Task.find(filter)
      .sort(sortOptions)
      .populate('createdBy', 'Username Email role');

    res.json({
      version: 'v2',
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Get tasks v2 error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

// GET single task with populated user (V2)
export const getTaskByIdV2 = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('createdBy', 'Username Email role');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({
      version: 'v2',
      task
    });
  } catch (error) {
    console.error('Get task by ID v2 error:', error);
    res.status(500).json({ message: 'Server error while fetching task' });
  }
};

// GET all tasks for a specific user with populate (V2)
export const getUserTasksV2 = async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.id;

    // Get user info
    const user = await User.findById(targetUserId).select('-password -token');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all tasks for this user with populate
    const tasks = await Task.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'Username Email role');

    // Calculate stats
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      highPriority: tasks.filter(t => t.priority === 'high').length,
      mediumPriority: tasks.filter(t => t.priority === 'medium').length,
      lowPriority: tasks.filter(t => t.priority === 'low').length
    };

    res.json({
      version: 'v2',
      user: {
        id: user._id,
        Username: user.Username,
        Email: user.Email,
        role: user.role,
        createdAt: user.createdAt
      },
      tasks,
      stats,
      meta: {
        populatedFields: ['createdBy'],
        virtuals: ['statusFormatted', 'isOverdue']
      }
    });
  } catch (error) {
    console.error('Get user tasks v2 error:', error);
    res.status(500).json({ message: 'Server error while fetching user tasks' });
  }
};

// GET tasks with virtual population and aggregation (V2)
export const getTasksWithStatsV2 = async (req, res) => {
  try {
    const { status, priority, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query filter
    const filter = { userId: req.user.id };

    if (status !== undefined) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get tasks with populate
    const tasks = await Task.find(filter)
      .sort(sortOptions)
      .populate('createdBy', 'Username Email role');

    // Calculate stats
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      highPriority: tasks.filter(t => t.priority === 'high').length,
      mediumPriority: tasks.filter(t => t.priority === 'medium').length,
      lowPriority: tasks.filter(t => t.priority === 'low').length,
      overdue: tasks.filter(t => t.isOverdue).length
    };

    // Add virtual field information
    const tasksWithVirtuals = tasks.map(task => ({
      ...task.toObject(),
      statusFormatted: task.status.replace('_', ' '),
      isOverdue: task.isOverdue
    }));

    res.json({
      version: 'v2',
      count: tasks.length,
      stats,
      tasks: tasksWithVirtuals,
      meta: {
        populatedFields: ['createdBy'],
        virtuals: ['statusFormatted', 'isOverdue', 'createdBy']
      }
    });
  } catch (error) {
    console.error('Get tasks with stats v2 error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
};

export default {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  replaceTasks,
  getTaskStats,
  // V2 endpoints
  getTasksV2,
  getTaskByIdV2,
  getUserTasksV2,
  getTasksWithStatsV2
};
