import Task from "../models/Task.js";

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
    
    const task = new Task({
      userId: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'medium',
      dueDate: dueDate || null
    });
    
    await task.save();
    
    // Return task without userId
    const responseTask = task.toObject();
    delete responseTask.userId;
    
    res.status(201).json({
      success: true,
      task: responseTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Create task error:', error);
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

export default {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  replaceTasks,
  getTaskStats
};
