import nodemailer from 'nodemailer';
import logger from './logger';
import { env } from '../config/env.config';
import { TemplateEngine, TemplateData } from './templateEngine';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailUtil {
  private static transporter: nodemailer.Transporter;
  
  private static getTransporter(): nodemailer.Transporter {
    if (!EmailUtil.transporter) {
      // Use Ethereal for testing if no real email credentials
      if (env.EMAIL_USER === 'test@ethereal.email') {
        EmailUtil.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS
          }
        });
      } else {
        EmailUtil.transporter = nodemailer.createTransport({
          host: env.EMAIL_HOST,
          port: env.EMAIL_PORT,
          secure: env.EMAIL_PORT === 465,
          auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS
          }
        });
      }
    }
    
    return EmailUtil.transporter;
  }
  
  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = EmailUtil.getTransporter();
      
      const mailOptions = {
        from: `"${env.FROM_NAME}" <${env.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };
      
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Email sent successfully to ${options.to}`);
    } catch (error) {
      logger.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }
  
  /**
   * Send email using professional template
   */
  static async sendTemplateEmail(
    templateName: string, 
    to: string, 
    subject: string, 
    data: TemplateData
  ): Promise<void> {
    try {
      const html = await TemplateEngine.renderTemplate(templateName, {
        ...data,
        subject,
        recipientEmail: to
      });
      
      await EmailUtil.sendEmail({
        to,
        subject,
        html
      });
      
      logger.info(`✅ Template email sent: ${templateName} → ${to}`);
    } catch (error) {
      logger.error(`❌ Error sending template email ${templateName}:`, error);
      throw error;
    }
  }
  
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    logger.info('Sending verification email to:', email);
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await EmailUtil.sendTemplateEmail('verification', email, 'Verify Your Email Address', {
      firstName: 'User',
      email,
      verificationUrl,
      supportUrl: `${env.FRONTEND_URL}/support`
    });
  }
  
  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    
    await EmailUtil.sendTemplateEmail('password-reset', email, 'Reset Your Password', {
      firstName: 'User',
      email,
      resetUrl,
      supportUrl: `${env.FRONTEND_URL}/support`
    });
  }
  
  static async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await EmailUtil.sendTemplateEmail('welcome', email, 'Welcome to CRM System!', {
      firstName,
      email,
      loginUrl: `${env.FRONTEND_URL}/login`,
      helpUrl: `${env.FRONTEND_URL}/help`,
      supportUrl: `${env.FRONTEND_URL}/support`
    });
  }
  
  /**
   * Send account deactivation email
   */
  static async sendAccountDeactivatedEmail(
    email: string, 
    firstName: string, 
    reason: string
  ): Promise<void> {
    await EmailUtil.sendTemplateEmail('account-deactivated', email, 'Account Deactivated', {
      firstName,
      email,
      deactivationReason: reason,
      dataRetentionDays: 30,
      reactivateUrl: `${env.FRONTEND_URL}/reactivate`,
      supportUrl: `${env.FRONTEND_URL}/support`
    });
  }
  
  /**
   * Send subscription expired email
   */
  static async sendSubscriptionExpiredEmail(
    email: string, 
    firstName: string, 
    expiryDate: string
  ): Promise<void> {
    await EmailUtil.sendTemplateEmail('subscription-expired', email, 'Subscription Expired', {
      firstName,
      email,
      expiryDate,
      gracePeriodDays: 7,
      deletionDays: 30,
      renewalUrl: `${env.FRONTEND_URL}/billing`,
      supportUrl: `${env.FRONTEND_URL}/support`
    });
  }
  
  /**
   * Send newsletter email
   */
  static async sendNewsletterEmail(
    email: string, 
    firstName: string, 
    newsletterData: any
  ): Promise<void> {
    await EmailUtil.sendTemplateEmail('newsletter', email, newsletterData.subject, {
      firstName,
      email,
      ...newsletterData,
      communityUrl: `${env.FRONTEND_URL}/community`,
      feedbackUrl: `${env.FRONTEND_URL}/feedback`
    });
  }
  
  static async testConnection(): Promise<boolean> {
    try {
      const transporter = EmailUtil.getTransporter();
      await transporter.verify();
      logger.info('✅ Email service is ready');
      return true;
    } catch (error) {
      logger.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

export const EmailSender = EmailUtil;
