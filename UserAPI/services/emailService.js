import nodemailer from 'nodemailer';
import config from '../config/index.js';

/**
 * Email Service for sending task notifications
 */

// Create transporter for sending emails
// Using environment variables for credentials
const createTransporter = () => {
  const emailConfig = {
    host: config.EMAIL_HOST || 'smtp.gmail.com',
    port: config.EMAIL_PORT || 587,
    secure: config.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD
    }
  };

  // Only create transporter if email credentials are configured
  if (config.EMAIL_USER && config.EMAIL_PASSWORD) {
    return nodemailer.createTransport(emailConfig);
  }
  
  return null;
};

const transporter = createTransporter();

/**
 * Send task creation confirmation email
 * @param {Object} user - User object containing email and username
 * @param {Object} task - Task object containing task details
 * @returns {Promise<boolean>} - True if email sent successfully, false otherwise
 */
export const sendTaskCreatedEmail = async (user, task) => {
  // Don't send email if transporter is not configured
  if (!transporter) {
    console.log('Email service not configured. Skipping task notification email.');
    console.log('To enable email notifications, configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env file.');
    return false;
  }

  try {
    const mailOptions = {
      from: {
        name: 'GetItDone Task Manager',
        address: config.EMAIL_USER
      },
      to: user.Email,
      subject: `✅ New Task Created: ${task.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .task-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; }
            .status-pending { color: #f39c12; }
            .status-in_progress { color: #3498db; }
            .status-completed { color: #27ae60; }
            .priority-high { color: #e74c3c; }
            .priority-medium { color: #f39c12; }
            .priority-low { color: #27ae60; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Task Created Successfully!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.Username},</p>
              <p>A new task has been created in your Get It Done account:</p>
              
              <div class="task-info">
                <p><span class="label">Task Title:</span> ${task.title}</p>
                ${task.description ? `<p><span class="label">Description:</span> ${task.description}</p>` : ''}
                <p><span class="label">Status:</span> <span class="status-${task.status}">${formatStatus(task.status)}</span></p>
                <p><span class="label">Priority:</span> <span class="priority-${task.priority}">${formatPriority(task.priority)}</span></p>
                ${task.dueDate ? `<p><span class="label">Due Date:</span> ${formatDate(task.dueDate)}</p>` : ''}
                <p><span class="label">Created:</span> ${formatDate(task.createdAt)}</p>
              </div>
              
              <p>You can view and manage all your tasks by logging into your GetItDone account.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from GetItDone Task Manager.</p>
              <p>© ${new Date().getFullYear()} GetItDone. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Task notification email sent to ${user.Email}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending task notification email:', error.message);
    // Don't throw - email sending should not fail the task creation
    return false;
  }
};

/**
 * Format status for display
 */
const formatStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'completed': 'Completed'
  };
  return statusMap[status] || status;
};

/**
 * Format priority for display
 */
const formatPriority = (priority) => {
  const priorityMap = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High'
  };
  return priorityMap[priority] || priority;
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Verify email configuration (for testing/debugging)
 */
export const verifyEmailConfig = async () => {
  if (!transporter) {
    console.log('Email service not configured');
    return false;
  }

  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error.message);
    return false;
  }
};

export default {
  sendTaskCreatedEmail,
  verifyEmailConfig
};

