const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.host = process.env.EMAIL_HOST;
    this.port = process.env.EMAIL_PORT;
    this.user = process.env.EMAIL_USER;
    this.pass = process.env.EMAIL_PASS;
    this.from = process.env.EMAIL_FROM || 'noreply@workconnect.com';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Initialize transporter
    if (this.user && this.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: Number(this.port),
        secure: Number(this.port) === 465, // true for 465, false for 587 and others
        auth: {
          user: this.user,
          pass: this.pass,
        },
        tls: {
          rejectUnauthorized: false // Helps bypass local dev SSL interception issues
        }
      });
      logger.info('✉️ Email Service Initialized: SMTP Transporter Ready');
    } else {
      this.transporter = null;
      logger.info('✉️ Email Service Initialized: Simulation Mode Active (No credentials)');
    }
  }

  async sendMail({ to, subject, html }) {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"WorkConnect Team" <${this.from}>`,
          to,
          subject,
          html,
        });
        logger.info(`✉️ Email successfully dispatched to: ${to}`);
      } else {
        // Fallback simulation mode
        logger.info('----------------------------------------------------');
        logger.info(`✉️ SIMULATED EMAIL DISPATCH:`);
        logger.info(`To: ${to}`);
        logger.info(`Subject: ${subject}`);
        logger.info(`Content:\n${html.replace(/<[^>]*>/g, ' ').substring(0, 300)}...`);
        logger.info('----------------------------------------------------');
      }
      return true;
    } catch (error) {
      // Failure safety constraint
      console.error('💥 EMAIL DISPATCH FAILURE:', error.message);
      return false; // Return false but do NOT throw to avoid breaking application workflows
    }
  }

  // HTML templates
  welcomeEmail(user) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Welcome to WorkConnect, ${user.name}!</h2>
        <p>Thank you for registering on our recruitment ecosystem. We are excited to support your journey.</p>
        <div style="margin: 30px 0;">
          <a href="${this.frontendUrl}/login" style="background-color: #1e63ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Access your Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Recruitment ecosystem.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: 'Welcome to WorkConnect!',
      html,
    });
  }

  otpEmail(user, otp) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Verify Your Account</h2>
        <p>Dear ${user.name}, please use the following OTP to verify your account.</p>
        <div style="background-color: #f7faff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: 'WorkConnect - Account Verification OTP',
      html,
    });
  }

  passwordResetEmail(user, resetToken) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Password Reset Request</h2>
        <p>Dear ${user.name}, you requested a password reset. Click the button below to set a new password.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1e63ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 15 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: 'WorkConnect - Password Reset',
      html,
    });
  }

  recruiterInvitationEmail(user, companyName, initialPassword) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">You've been invited to join ${companyName}</h2>
        <p>Dear ${user.name}, you have been invited as a Recruiter on the WorkConnect platform.</p>
        <p>Your employer has set up an initial password for you to access the portal:</p>
        <div style="background-color: #f7faff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px;">
          ${initialPassword}
        </div>
        <p>Please log in and you will be prompted to verify your email address using the OTP code sent in a separate email.</p>
        <div style="margin: 30px 0;">
          <a href="${this.frontendUrl}/login" style="background-color: #1e63ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login Now</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Invitation to join ${companyName} on WorkConnect`,
      html,
    });
  }

  approvalEmail(user, companyName, isApproved) {
    const status = isApproved ? 'Approved' : 'Rejected';
    const msg = isApproved 
      ? `Congratulations! Your corporate profile for **${companyName}** has been verified by the Admin panel. You can now post live job vacancies and source applicants.`
      : `We regret to inform you that your company verification registration for **${companyName}** was not approved at this time. Please contact support.`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Company Registration Status: ${status}</h2>
        <p>${msg}</p>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `WorkConnect Company Profile Verification: ${status}`,
      html,
    });
  }

  applicationEmail(user, jobTitle) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Application Confirmation</h2>
        <p>Dear ${user.name}, your application for **${jobTitle}** has been received successfully.</p>
        <p>The hiring team will review your credentials and reach out regarding subsequent steps.</p>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Recruitment ecosystem.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Application Confirmation: ${jobTitle}`,
      html,
    });
  }

  rejectionEmail(user, jobTitle) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Application Status Update</h2>
        <p>Dear ${user.name}, thank you for your interest in the **${jobTitle}** role.</p>
        <p>We regret to inform you that the hiring panel decided to proceed with other applicants whose experience aligns more closely at this time. We wish you success in your future search.</p>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Application Status: ${jobTitle}`,
      html,
    });
  }

  interviewEmail(user, jobTitle, interviewDetails) {
    const { date, type, link } = interviewDetails;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Interview Schedule Invitation</h2>
        <p>Dear ${user.name}, you have been invited to a live panel interview for **${jobTitle}**.</p>
        <div style="background-color: #f7faff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Format:</strong> ${type}</p>
          <p><strong>Date & Time:</strong> ${new Date(date).toLocaleString()}</p>
          <p><strong>Video Link:</strong> <a href="${link}">${link}</a></p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Interview Scheduled: ${jobTitle}`,
      html,
    });
  }

  offerEmail(user, jobTitle, offerDetails) {
    const { salary, joiningDate } = offerDetails;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Official Job Offer Proposal!</h2>
        <p>Dear ${user.name}, we are thrilled to extend an official job offer for the **${jobTitle}** role.</p>
        <div style="background-color: #f7faff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Base Salary:</strong> $${salary.toLocaleString()}/yr</p>
          <p><strong>Proposed Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString()}</p>
        </div>
        <p>Please log into your dashboard to review and accept/decline the terms.</p>
        <div style="margin: 20px 0;">
          <a href="${this.frontendUrl}/candidate/offers" style="background-color: #1e63ff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Review Job Offer</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Job Offer Extended: ${jobTitle}`,
      html,
    });
  }

  onboardingEmail(user, companyName) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6eef9; border-radius: 16px;">
        <h2 style="color: #0b1f3b;">Welcome & Onboarding Instructions</h2>
        <p>Dear ${user.name}, welcome to **${companyName}**!</p>
        <p>Your onboarding documents have been successfully verified. We are preparing everything for your first day!</p>
        <hr style="border: 0; border-top: 1px solid #e6eef9;" />
        <p style="font-size: 11px; color: #94a3b8;">&copy; WorkConnect Team.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Onboarding Complete - Welcome to the Team!`,
      html,
    });
  }
}

module.exports = new EmailService();
