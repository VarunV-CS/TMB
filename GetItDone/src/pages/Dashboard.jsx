import { useState, useEffect } from 'react';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Get It Done!', completed: false },
    { id: 2, title: 'Try adding your first task', completed: false },
    { id: 3, title: 'Complete tasks to stay organized', completed: false }
  ]);
  const [newTask, setNewTask] = useState('');

  // Fetch user data from API service on mount
  useEffect(() => {
    const fetchUserData = () => {
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
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle logout - clear all authentication data and redirect
  const handleLogout = () => {
    // Call API logout to clear tokens
    api.logout();
    // Clear any additional localStorage items
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    // Redirect to login page
    window.location.href = '/';
  };

  const addTask = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), title: newTask.trim(), completed: false }]);
      setNewTask('');
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedCount = tasks.filter(task => task.completed).length;
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
            <span className="stat-number">{completedCount}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{totalCount - completedCount}</span>
            <span className="stat-label">Remaining</span>
          </div>
        </div>

        <div className="tasks-section">
          <div className="tasks-header">
            <h3>📋 Your Tasks</h3>
          </div>

          <form onSubmit={addTask} className="add-task-form">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="task-input"
            />
            <button type="submit" className="add-task-btn">
              Add Task
            </button>
          </form>

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <p className="no-tasks">No tasks yet. Add your first task above! 🎯</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <label className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span className="task-title">{task.title}</span>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="delete-task-btn"
                    title="Delete task"
                  >
                    ❌
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
