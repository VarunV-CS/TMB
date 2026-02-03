import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import Snackbar from '../components/Snackbar';
import PieChart from '../components/PieChart';
import './Dashboard.css';

function Dashboard() {
  // State hooks - MUST be called in same order on every render
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [view, setView] = useState('stats'); // 'stats' or 'tasks'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'in_progress', 'completed'
  const [dueDateFilter, setDueDateFilter] = useState('all'); // 'all', 'overdue', 'upcoming', 'none'
  const [sortByDueDate, setSortByDueDate] = useState(false); // Sort by due date
  const [editingDueDate, setEditingDueDate] = useState(null); // Track which task is being edited for due date
  const [editingTitle, setEditingTitle] = useState(null); // Track which task is being edited for title
  const [editingTitleValue, setEditingTitleValue] = useState(''); // Value for title edit input

  // Snackbar state
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info');

  // Show snackbar helper function
  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
  }, []);

  // Hide snackbar helper function
  const hideSnackbar = useCallback(() => {
    setSnackbarMessage('');
  }, []);

  // Check if a task is overdue
  const isOverdue = useCallback((task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date().setHours(0, 0, 0, 0);
  }, []);

  // Check if a task is due today
  const isDueToday = useCallback((task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    const today = new Date().setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate).setHours(0, 0, 0, 0);
    return dueDate === today;
  }, []);

  // Check if a task is upcoming (due within 7 days)
  const isUpcoming = useCallback((task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return dueDate > today && dueDate <= sevenDaysFromNow;
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateString);
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (taskDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }, []);

  // Get due date status class
  const getDueDateStatusClass = useCallback((task) => {
    if (!task.dueDate) return 'none';
    if (task.status === 'completed') return 'completed';
    if (isOverdue(task)) return 'overdue';
    if (isDueToday(task)) return 'overdue';
    if (isUpcoming(task)) return 'upcoming';
    return '';
  }, [isOverdue, isDueToday, isUpcoming]);

  // Get due date icon
  const getDueDateIcon = useCallback((task) => {
    if (!task.dueDate) return '🗓️';
    if (task.status === 'completed') return '✅';
    if (isOverdue(task)) return '⚠️';
    if (isDueToday(task)) return '⏰';
    return '🗓️';
  }, [isOverdue, isDueToday]);

  // Fetch user data and tasks from API on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = api.getUser();
        if (userData) {
          setUser(userData);
        } else {
          // Fallback: create user from token if available
          const token = api.getToken();
          if (token) {
            setUser({
              name: 'User',
              email: 'user@example.com'
            });
          }
        }

        // Fetch tasks from backend
        await fetchTasks();
      } catch (error) {
        console.error('Error fetching user data:', error);
        showSnackbar('Failed to load user data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [showSnackbar]);


  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      // Check if user is authenticated first
      const token = api.getToken();
      if (!token) {
        console.log('No token found, skipping task fetch');
        return;
      }
      
      const tasksData = await api.getTasks();
      
      // Ensure we get an array and normalize the ID field
      if (Array.isArray(tasksData)) {
        const normalizedTasks = tasksData.map(task => ({
          ...task,
          // Ensure we have both id and _id for compatibility
          id: task._id || task.id,
          _id: task._id || task.id
        }));
        setTasks(normalizedTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // If unauthorized, don't show error, just empty tasks
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        setTasks([]);
      } else {
        showSnackbar('Failed to load tasks', 'error');
        // Set fallback demo tasks for demo purposes
        setTasks([
          { 
            _id: 'demo-1', 
            id: 'demo-1',
            title: 'Welcome back! Your tasks will appear here.', 
            completed: false, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          }
        ]);
      }
    }
  };


  // Handle logout - clear all authentication data and redirect
  const handleLogout = async () => {
    try {
      // Call API logout to clear tokens on server
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear isAuthenticated flag
      localStorage.removeItem('isAuthenticated');
      // Redirect to login page
      window.location.href = '/';
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (newTask.trim()) {
      setIsSyncing(true);
      try {
        const trimmedTask = newTask.trim();
        
        // Client-side validation: Check if a task with the same name already exists (case-insensitive)
        const duplicateTask = tasks.find(
          task => task.title.toLowerCase() === trimmedTask.toLowerCase()
        );
        
        if (duplicateTask) {
          showSnackbar('A task with this name already exists', 'error');
          setIsSyncing(false);
          return;
        }
        
        console.log('Adding task:', trimmedTask, 'with priority:', newTaskPriority);
        const taskData = await api.addTask(trimmedTask, '', newTaskPriority, newTaskDueDate || null);
        console.log('Task added response:', taskData);
        
        if (taskData && taskData.task) {
          // Normalize the task ID
          const normalizedTask = {
            ...taskData.task,
            id: taskData.task._id || taskData.task.id,
            _id: taskData.task._id || taskData.task.id
          };
          setTasks(prevTasks => [...prevTasks, normalizedTask]);
          showSnackbar('Task added successfully!', 'success');
        } else {
          // Fallback if backend returns different format
          // Use crypto.randomUUID() for unique IDs
          const newTaskObj = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),//removeDate.now().toString(),
            title: trimmedTask,
            completed: false,
            priority: newTaskPriority,
            dueDate: newTaskDueDate || null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          setTasks(prevTasks => [...prevTasks, newTaskObj]);
          showSnackbar('Task added successfully!', 'success');
        }
        setNewTask('');
        setNewTaskDueDate('');
      } catch (error) {
        console.error('Error adding task:', error);
        // Handle duplicate error from server
        if (error.message && error.message.includes('already exists')) {
          showSnackbar('A task with this name already exists', 'error');
        } else {
          showSnackbar('Failed to add task: ' + (error.message || 'Unknown error'), 'error');
        }
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleToggleTask = async (id, e) => {
    // Prevent event bubbling if called from a nested element
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) {
        console.error('Task not found:', id);
        return;
      }

      // Cycle through statuses: pending -> in_progress -> completed -> pending
      const statusCycle = {
        'pending': 'in_progress',
        'in_progress': 'completed',
        'completed': 'pending'
      };
      const newStatus = statusCycle[task.status] || 'pending';
      console.log('Changing task status:', id, 'from', task.status, 'to', newStatus);

      // Get status display text for snackbar
      const statusText = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'completed': 'Completed'
      };

      // Optimistic update - immediately update UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === id ? { ...t, status: newStatus, updatedAt: new Date() } : t
        )
      );

      // Sync with backend
      const response = await api.updateTask(id, { status: newStatus });
      console.log('Status update response:', response);
      showSnackbar(`Task marked as ${statusText[newStatus]}`, 'success');
    } catch (error) {
      console.error('Error updating task status:', error);
      showSnackbar('Failed to update task status', 'error');
      // Revert on error by refetching
      fetchTasks();
    }
  };

  const handleDeleteTask = async (id, e) => {
    // Prevent event bubbling - THIS IS CRITICAL
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log('Deleting task:', id);
    
    try {
      // Optimistic update
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
      showSnackbar('Task deleted successfully!', 'success');

      // Sync with backend
      const response = await api.deleteTask(id);
      console.log('Delete response:', response);
    } catch (error) {
      console.error('Error deleting task:', error);
      showSnackbar('Failed to delete task', 'error');
      // Revert on error by refetching
      fetchTasks();
    }
  };

  // Handle priority change for existing tasks
  const handlePriorityChange = async (id, newPriority, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) {
        console.error('Task not found:', id);
        return;
      }

      console.log('Changing task priority:', id, 'from', task.priority, 'to', newPriority);

      // Optimistic update - immediately update UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === id ? { ...t, priority: newPriority, updatedAt: new Date() } : t
        )
      );

      // Sync with backend
      await api.updateTask(id, { priority: newPriority });
      
      const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High' };
      showSnackbar(`Task priority changed to ${priorityLabels[newPriority]}`, 'success');
    } catch (error) {
      console.error('Error updating task priority:', error);
      showSnackbar('Failed to update task priority', 'error');
      // Revert on error by refetching
      fetchTasks();
    }
  };

  // Handle due date change for existing tasks
  const handleDueDateChange = async (id, newDueDate, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) {
        console.error('Task not found:', id);
        return;
      }

      console.log('Changing task due date:', id, 'from', task.dueDate, 'to', newDueDate);

      // Optimistic update - immediately update UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === id ? { ...t, dueDate: newDueDate, updatedAt: new Date() } : t
        )
      );

      // Sync with backend
      await api.updateTask(id, { dueDate: newDueDate || null });
      
      if (newDueDate) {
        showSnackbar('Due date set successfully', 'success');
      } else {
        showSnackbar('Due date cleared', 'info');
      }
      
      // Stop editing
      setEditingDueDate(null);
    } catch (error) {
      console.error('Error updating task due date:', error);
      showSnackbar('Failed to update task due date', 'error');
      // Revert on error by refetching
      fetchTasks();
    }
  };

  // Start editing due date for a task
  const startEditingDueDate = useCallback((id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingDueDate(id);
  }, []);

  // Cancel editing due date
  const cancelEditingDueDate = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingDueDate(null);
  }, []);

  // Start editing title for a task
  const startEditingTitle = useCallback((id, currentTitle, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingTitle(id);
    setEditingTitleValue(currentTitle);
  }, []);

  // Save edited title for a task
  const saveTitle = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const trimmedTitle = editingTitleValue.trim();
    
    if (!trimmedTitle) {
      showSnackbar('Task title cannot be empty', 'error');
      return;
    }

    try {
      const task = tasks.find(t => t.id === id);
      if (!task) {
        console.error('Task not found:', id);
        return;
      }

      // Check for duplicate title (case-insensitive)
      if (trimmedTitle.toLowerCase() !== task.title.toLowerCase()) {
        const duplicateTask = tasks.find(
          t => t.id !== id && t.title.toLowerCase() === trimmedTitle.toLowerCase()
        );
        
        if (duplicateTask) {
          showSnackbar('A task with this name already exists', 'error');
          return;
        }
      }

      console.log('Saving task title:', id, 'from', task.title, 'to', trimmedTitle);

      // Optimistic update - immediately update UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === id ? { ...t, title: trimmedTitle, updatedAt: new Date() } : t
        )
      );

      // Sync with backend
      await api.updateTask(id, { title: trimmedTitle });
      
      showSnackbar('Task title updated successfully', 'success');
      
      // Stop editing
      setEditingTitle(null);
      setEditingTitleValue('');
    } catch (error) {
      console.error('Error updating task title:', error);
      showSnackbar('Failed to update task title: ' + (error.message || 'Unknown error'), 'error');
      // Revert on error by refetching
      fetchTasks();
    }
  };

  // Cancel editing title
  const cancelEditingTitle = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingTitle(null);
    setEditingTitleValue('');
  }, []);

  const handleNewTaskChange = useCallback((e) => {
    setNewTask(e.target.value);
  }, []);

  const showTasksSection = useCallback(() => {
    setView('tasks');
  }, []);

  const showStatsSection = useCallback(() => {
    setView('stats');
  }, []);

  // Calculate task counts
  const completedCount = tasks.filter(task => task.status === 'completed').length;
  const inProgressCount = tasks.filter(task => task.status === 'in_progress').length;
  const pendingCount = tasks.filter(task => task.status === 'pending').length;
  const overdueCount = tasks.filter(task => isOverdue(task)).length;
  const totalCount = tasks.length;

  // Filter and sort tasks based on due date settings
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply due date filter
    if (dueDateFilter === 'overdue') {
      result = result.filter(t => isOverdue(t));
    } else if (dueDateFilter === 'today') {
      result = result.filter(t => isDueToday(t));
    } else if (dueDateFilter === 'upcoming') {
      result = result.filter(t => isUpcoming(t));
    } else if (dueDateFilter === 'none') {
      result = result.filter(t => !t.dueDate);
    }
    // 'all' shows all tasks

    // Apply status filter if needed (currently always shows all)
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Sort by due date if enabled
    if (sortByDueDate) {
      result.sort((a, b) => {
        // Tasks with no due date go last
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    }

    return result;
  }, [tasks, dueDateFilter, statusFilter, sortByDueDate, isOverdue, isDueToday, isUpcoming]);

  // Calculate pie chart data
  const statusData = useMemo(() => {
    const data = [
      { name: 'Pending', value: pendingCount, color: '#f59e0b' },
      { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
      { name: 'Completed', value: completedCount, color: '#10b981' }
    ];
    return data.filter(item => item.value > 0);
  }, [pendingCount, inProgressCount, completedCount]);

  const priorityData = useMemo(() => {
    const lowCount = tasks.filter(t => t.priority === 'low').length;
    const mediumCount = tasks.filter(t => t.priority === 'medium').length;
    const highCount = tasks.filter(t => t.priority === 'high').length;
    
    const data = [
      { name: 'Low', value: lowCount, color: '#10b981' },
      { name: 'Medium', value: mediumCount, color: '#f59e0b' },
      { name: 'High', value: highCount, color: '#ef4444' }
    ];
    return data.filter(item => item.value > 0);
  }, [tasks]);

  // Stats Section Content
  const statsSectionContent = (
    <>
      <div className="welcome-section">
        <h2>Welcome back, {user?.name || 'User'}! 👋</h2>
        <p>Ready to tackle your tasks today?</p>
      </div>

      {/* Pie Charts Section */}
      <div className="piecharts-section">
        <PieChart data={statusData} title="Tasks by Status" />
        <PieChart data={priorityData} title="Tasks by Priority" />
      </div>

      <div className="stats-section">

        <div className="stat-card">
          <span className="stat-number">{totalCount}</span>
          <span className="stat-label">Total Tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{inProgressCount}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{completedCount}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card overdue-stat-card">
          <span className="stat-number overdue-number">{overdueCount}</span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>

      <div className="my-tasks-btn-container">
        <button className="add-task-btn" onClick={showTasksSection}>
          My Tasks
        </button>
      </div>
    </>
  );

  // Tasks Section Content
  const tasksSectionContent = (
    <>
      <div className="tasks-header-row">
        <div className="tasks-header">
          <h3>Your Tasks</h3>
        </div>

        <div className="dashboard-btn-container">
            <button className="dashboard-btn" onClick={showStatsSection}>
              Dashboard 📋
            </button>
        </div>
      </div>

      {/* Due Date Filter */}
      <div className="due-date-filter">
        <span className="due-date-filter-label">Due Date Filter:</span>
        <select
          value={dueDateFilter}
          onChange={(e) => setDueDateFilter(e.target.value)}
          className="due-date-filter-select"
        >
          <option value="all">All Tasks</option>
          <option value="overdue">Overdue ({tasks.filter(t => isOverdue(t)).length})</option>
          <option value="today">Due Today ({tasks.filter(t => isDueToday(t)).length})</option>
          <option value="upcoming">Upcoming ({tasks.filter(t => isUpcoming(t)).length})</option>
          <option value="none">No Due Date ({tasks.filter(t => !t.dueDate).length})</option>
        </select>
        <button 
          className={`sort-due-date-btn ${sortByDueDate ? 'active' : ''}`}
          onClick={() => setSortByDueDate(!sortByDueDate)}
          title={sortByDueDate ? 'Disable sorting by due date' : 'Enable sorting by due date'}
        >
          {sortByDueDate ? '🗓️' : '🗓️'} Sort by Due Date
        </button>
      </div>

      <form onSubmit={handleAddTask} className="add-task-form">
        <input
          type="text"
          value={newTask}
          onChange={handleNewTaskChange}
          placeholder="Add a new task..."
          className="task-input"
          disabled={isSyncing}
        />
        <div className="priority-selector">
          <label className="priority-label">Priority:</label>
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            className="priority-select"
            disabled={isSyncing}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>
        <div className="due-date-selector">
          <label className="due-date-label">Due:</label>
          <input
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            className="due-date-input"
            disabled={isSyncing}
          />
        </div>
        <button type="submit" className="add-task-btn" disabled={isSyncing || !newTask.trim()}>
          {isSyncing ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      <div className="tasks-section-container">
        <div className="tasks-list">
          {filteredAndSortedTasks.length === 0 ? (
            <p className="no-tasks">No tasks found. {dueDateFilter !== 'all' ? 'Try a different filter.' : 'Add your first task above! 🎯'}</p>
          ) : (
            filteredAndSortedTasks.map(task => (
              <div 
                key={task.id} 
                className={`task-item task-${task.status} ${isOverdue(task) ? 'overdue' : ''} ${task.dueDate ? 'has-due-date' : ''}`}
                onClick={(e) => {
                  if (!e.target.closest('.task-checkbox') && !e.target.closest('.delete-task-btn') && !e.target.closest('.task-priority-select') && !e.target.closest('.task-due-date') && !e.target.closest('.task-due-date-edit') && !e.target.closest('.due-date-edit-container') && !e.target.closest('.title-edit-container') && !e.target.closest('.task-title-container') && !e.target.closest('.edit-title-btn')) {
                    handleToggleTask(task.id, e);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <label className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={(e) => handleToggleTask(task.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isSyncing}
                  />
                  <span className="checkmark"></span>
                </label>
                {/* Task Title Display/Edit */}
                {editingTitle === task.id ? (
                  <div className="title-edit-container" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="task-title-edit"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onBlur={() => saveTitle(task.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveTitle(task.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingTitle();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <span 
                    className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {task.title}
                    <button 
                      className="edit-title-btn-inline"
                      onClick={(e) => startEditingTitle(task.id, task.title, e)}
                      title={task.status === 'completed' ? 'Cannot edit title of completed tasks' : 'Edit task title'}
                      disabled={isSyncing || task.status === 'completed'}
                      style={{ opacity: task.status === 'completed' ? 0.2 : undefined, cursor: task.status === 'completed' ? 'not-allowed' : 'pointer' }}
                    >
                      ✏️
                    </button>
                  </span>
                )}
                <select
                  className={`task-priority-select priority-${task.priority || 'medium'}`}
                  value={task.priority || 'medium'}
                  onChange={(e) => handlePriorityChange(task.id, e.target.value, e)}
                  onClick={(e) => e.stopPropagation()}
                  title={task.status === 'completed' ? 'Cannot change priority of completed tasks' : 'Change priority'}
                  disabled={task.status === 'completed'}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
                <span className={`task-status-badge status-${task.status}`}>
                  {task.status === 'pending' ? '⏳' : task.status === 'in_progress' ? '🔄' : '✅'}
                </span>
                {/* Due Date Display/Edit */}
                {editingDueDate === task.id ? (
                  <div className="due-date-edit-container" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      className="task-due-date-edit"
                      value={task.dueDate || ''}
                      onChange={(e) => handleDueDateChange(task.id, e.target.value, e)}
                      onBlur={() => setEditingDueDate(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleDueDateChange(task.id, e.target.value, e);
                        } else if (e.key === 'Escape') {
                          setEditingDueDate(null);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div 
                    className={`task-due-date ${getDueDateStatusClass(task)}`}
                    onClick={(e) => task.status !== 'completed' && startEditingDueDate(task.id, e)}
                    title={task.dueDate ? 'Click to edit due date' : 'Click to set due date'}
                    style={{ cursor: task.status === 'completed' ? 'default' : 'pointer' }}
                  >
                    <span className="due-icon">{getDueDateIcon(task)}</span>
                    <span>{task.dueDate ? formatDate(task.dueDate) : '�️ Set due'}</span>
                  </div>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id, e);
                  }}
                  className="delete-task-btn"
                  title="Delete task"
                  disabled={isSyncing}
                >
                  ❌
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  // Main render - NO EARLY RETURNS to maintain hook order
  return (
    <div className="dashboard">
      {/* Loading State */}
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      ) : !user ? (
        /* User Not Authenticated State */
        <div className="dashboard-error">
          <p>Unable to load user data. Please log in again.</p>
          <button onClick={handleLogout} className="logout-btn">
            Return to Login
          </button>
        </div>
      ) : (
        /* Main Dashboard Content */
        <>
          <header className="dashboard-header">
            <div className="header-left">
              <h1 className="dashboard-title">Get It Done</h1>
            </div>
            <div className="header-right">
              <div className="user-info">
                <span className="user-avatar">👤</span>
                <span className="user-name">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </header>

          <main className="dashboard-main">
            {view === 'stats' ? statsSectionContent : tasksSectionContent}
          </main>

          {/* Snackbar notification */}
          <Snackbar
            message={snackbarMessage}
            type={snackbarType}
            onClose={hideSnackbar}
          />
        </>
      )}
    </div>
  );
}

export default Dashboard;

