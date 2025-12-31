import sgMail from '@sendgrid/mail';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

interface DocumentShareEmailData {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  documentTitle: string;
  documentType: string;
  message?: string;
  documentUrl: string;
}

interface NotificationEmailData {
  recipientName: string;
  recipientEmail: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

interface CaseUpdateEmailData {
  recipientName: string;
  recipientEmail: string;
  caseName: string;
  updateType: string;
  updateMessage: string;
  caseUrl: string;
}

class EmailService {
  private isConfigured: boolean = false;
  private fromEmail: string;
  private fromName: string = 'Sentinel Counsel';

  constructor() {
    // Check for API key with multiple possible names
    const apiKey = process.env.SENDGRID_API_KEY || process.env.sendgrid;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@sentinelcounsel.com';
    
    if (apiKey && apiKey.trim() !== '') {
      try {
        sgMail.setApiKey(apiKey);
        this.isConfigured = true;
        console.log('[EmailService] ✓ SendGrid configured - emails will be sent');
        console.log(`[EmailService] From address: ${this.fromEmail}`);
      } catch (error) {
        console.error('[EmailService] ✗ SendGrid configuration failed:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('[EmailService] ⚠ SendGrid API key not found - emails will be logged to console');
      this.isConfigured = false;
    }
  }

  /**
   * Reinitialize the service (useful after adding API key)
   */
  reinitialize(): void {
    // Check for API key with multiple possible names
    const apiKey = process.env.SENDGRID_API_KEY || process.env.sendgrid;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@sentinelcounsel.com';
    
    if (apiKey && apiKey.trim() !== '') {
      try {
        sgMail.setApiKey(apiKey);
        this.isConfigured = true;
        console.log('[EmailService] ✓ SendGrid reinitialized successfully');
      } catch (error) {
        console.error('[EmailService] ✗ SendGrid reinitialization failed:', error);
        this.isConfigured = false;
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, from } = options;
    const fromAddress = from || this.fromEmail;

    if (this.isConfigured) {
      // Real email sending via SendGrid
      try {
        const msg = {
          to,
          from: fromAddress,
          subject,
          html,
        };

        await sgMail.send(msg);
        console.log(`[EmailService] ✓ Email sent to ${to}: ${subject}`);
        return true;
      } catch (error: any) {
        console.error('[EmailService] ✗ Failed to send email:', error);
        if (error.response) {
          console.error('[EmailService] SendGrid error details:', error.response.body);
        }
        
        // Fallback to console logging
        this.logEmailToConsole({ to, subject, html, from: fromAddress });
        return false;
      }
    } else {
      // Placeholder mode - log to console
      this.logEmailToConsole({ to, subject, html, from: fromAddress });
      return true;
    }
  }

  private logEmailToConsole(options: EmailOptions & { from: string }) {
    const { to, subject, html, from } = options;
    
    console.log('\n' + '='.repeat(80));
    console.log('[EmailService] 📧 EMAIL (Console Mode - Add SENDGRID_API_KEY to send real emails)');
    console.log('='.repeat(80));
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(80));
    console.log('HTML Body:');
    console.log(html);
    console.log('='.repeat(80) + '\n');
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  getFromEmail(): string {
    return this.fromEmail;
  }

  /**
   * Send a document sharing notification email
   */
  async sendDocumentShareEmail(data: DocumentShareEmailData): Promise<boolean> {
    const { recipientName, recipientEmail, senderName, documentTitle, documentType, message, documentUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .document-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .document-title { font-size: 18px; font-weight: 600; color: #1a1a2e; margin-bottom: 10px; }
          .document-type { color: #6c757d; font-size: 14px; margin-bottom: 15px; }
          .message { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Document Shared With You</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${senderName}</strong> has shared a document with you on Sentinel Counsel.</p>
            
            <div class="document-card">
              <div class="document-title">${documentTitle}</div>
              <div class="document-type">Type: ${documentType}</div>
            </div>
            
            ${message ? `<div class="message"><strong>Message:</strong> ${message}</div>` : ''}
            
            <p style="text-align: center; margin-top: 25px;">
              <a href="${documentUrl}" class="button">View Document</a>
            </p>
          </div>
          <div class="footer">
            <p>This email was sent by Sentinel Counsel LLP.<br>Compliance monitoring and case management platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `📄 ${senderName} shared a document with you: ${documentTitle}`,
      html,
    });
  }

  /**
   * Send a case update notification email
   */
  async sendCaseUpdateEmail(data: CaseUpdateEmailData): Promise<boolean> {
    const { recipientName, recipientEmail, caseName, updateType, updateMessage, caseUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .update-badge { display: inline-block; background: #ffc107; color: #1a1a2e; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 15px; }
          .case-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .case-name { font-size: 18px; font-weight: 600; color: #1a1a2e; margin-bottom: 10px; }
          .update-message { color: #495057; }
          .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Case Update</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>There's a new update on a case you're following:</p>
            
            <div class="case-card">
              <span class="update-badge">${updateType}</span>
              <div class="case-name">${caseName}</div>
              <div class="update-message">${updateMessage}</div>
            </div>
            
            <p style="text-align: center; margin-top: 25px;">
              <a href="${caseUrl}" class="button">View Case</a>
            </p>
          </div>
          <div class="footer">
            <p>This email was sent by Sentinel Counsel LLP.<br>Compliance monitoring and case management platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `📋 Case Update: ${caseName} - ${updateType}`,
      html,
    });
  }

  /**
   * Send a general notification email
   */
  async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
    const { recipientName, recipientEmail, title, message, actionUrl, actionText } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .notification-title { font-size: 20px; font-weight: 600; color: #1a1a2e; margin-bottom: 15px; }
          .notification-message { color: #495057; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
          .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Notification</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
            
            ${actionUrl ? `
              <p style="text-align: center; margin-top: 25px;">
                <a href="${actionUrl}" class="button">${actionText || 'View Details'}</a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>This email was sent by Sentinel Counsel LLP.<br>Compliance monitoring and case management platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `🔔 ${title}`,
      html,
    });
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; }
          .success { font-size: 48px; margin-bottom: 20px; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Email Configuration Successful!</h1>
          </div>
          <div class="content">
            <div class="success">✅</div>
            <h2>Congratulations!</h2>
            <p>Your SendGrid email integration is working correctly.</p>
            <p>You can now receive email notifications for:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Document sharing alerts</li>
              <li>Case updates and assignments</li>
              <li>Compliance notifications</li>
              <li>Whistleblower report alerts</li>
            </ul>
            <p style="margin-top: 20px; color: #6c757d;">Sent at: ${new Date().toISOString()}</p>
          </div>
          <div class="footer">
            <p>Sentinel Counsel LLP - Compliance Monitoring Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const success = await this.sendEmail({
        to: toEmail,
        subject: '✅ Sentinel Counsel - Email Configuration Test',
        html,
      });

      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Email sending returned false - check server logs' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
