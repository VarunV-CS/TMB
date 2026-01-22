import { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Welcome to GetItDone! 🎉', completed: false },
    { id: 2, title: 'Try adding your first task', completed: false },
    { id: 3, title: 'Complete tasks to stay organized', completed: false }
  ]);
  const [newTask, setNewTask] = useState('');

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">GetItDone</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">👤</span>
            <span className="user-name">{user.name}</span>
          </div>
          <button onClick={onLogout} className="logout-btn">
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
                    🗑️
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
