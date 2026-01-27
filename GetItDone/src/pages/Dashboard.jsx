import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskError, setTaskError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [view, setView] = useState('stats'); // 'stats' or 'tasks'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'in_progress', 'completed'

  // Fetch user data and tasks from API on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Wait a bit to ensure token is properly set in localStorage
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);


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
    setTaskError('');
    
    if (newTask.trim()) {
      setIsSyncing(true);
      try {
      console.log('Adding task:', newTask.trim());
        const taskData = await api.addTask(newTask.trim());
        console.log('Task added response:', taskData);
        
        if (taskData && taskData.task) {
          // Normalize the task ID
          const normalizedTask = {
            ...taskData.task,
            id: taskData.task._id || taskData.task.id,
            _id: taskData.task._id || taskData.task.id
          };
          setTasks(prevTasks => [...prevTasks, normalizedTask]);
        } else {
          // Fallback if backend returns different format
          // Use crypto.randomUUID() for unique IDs
          const newTaskObj = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),//removeDate.now().toString(),
            title: newTask.trim(),
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          setTasks(prevTasks => [...prevTasks, newTaskObj]);
        }
        setNewTask('');
      } catch (error) {
        console.error('Error adding task:', error);
        setTaskError('Failed to add task: ' + (error.message || 'Unknown error'));
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

      // Optimistic update - immediately update UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === id ? { ...t, status: newStatus, updatedAt: new Date() } : t
        )
      );

      // Sync with backend
      const response = await api.updateTask(id, { status: newStatus });
      console.log('Status update response:', response);
    } catch (error) {
      console.error('Error updating task status:', error);
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

      // Sync with backend
      const response = await api.deleteTask(id);
      console.log('Delete response:', response);
    } catch (error) {
      console.error('Error deleting task:', error);
      // Revert on error by refetching
      fetchTasks();
    }
  };

  const handleNewTaskChange = useCallback((e) => {
    setNewTask(e.target.value);
  }, []);

  const showTasksSection = useCallback(() => {
    setView('tasks');
  }, []);

  const showStatsSection = useCallback(() => {
    setView('stats');
  }, []);

  const completedCount = tasks.filter(task => task.status === 'completed').length;
  const inProgressCount = tasks.filter(task => task.status === 'in_progress').length;
  const pendingCount = tasks.filter(task => task.status === 'pending').length;
  const totalCount = tasks.length;

  // Show loading state while fetching user data
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Handle case where user data is missing
  if (!user) {
    return (
      <div className="dashboard-error">
        <p>Unable to load user data. Please log in again.</p>
        <button onClick={handleLogout} className="logout-btn">
          Return to Login
        </button>
      </div>
    );
  }

  // Stats Section Content
  const statsSectionContent = (
    <>
      <div className="welcome-section">
        <h2>Welcome back, {user.name}! 👋</h2>
        <p>Ready to tackle your tasks today?</p>
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
      <div className="tasks-header">
        <h3>📋 Your Tasks</h3>
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
        <button type="submit" className="add-task-btn" disabled={isSyncing || !newTask.trim()}>
          {isSyncing ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {taskError && (
        <div className="task-error">
          {taskError}
        </div>
      )}

      <div className="tasks-section-container">
        <div className="tasks-list">
          {tasks.length === 0 ? (
            <p className="no-tasks">No tasks yet. Add your first task above! 🎯</p>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`task-item task-${task.status}`}
                onClick={(e) => {
                  if (!e.target.closest('.task-checkbox') && !e.target.closest('.delete-task-btn')) {
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
                <span className="task-title" onClick={(e) => e.stopPropagation()}>{task.title}</span>
                <span className={`task-status-badge status-${task.status}`}>
                  {task.status === 'pending' ? '⏳' : task.status === 'in_progress' ? '🔄' : '✅'}
                </span>
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

        <div className="dashboard-btn-container">
          <button className="dashboard-btn" onClick={showStatsSection}>
            Dashboard
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="dashboard">
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
    </div>
  );
}

export default Dashboard;

