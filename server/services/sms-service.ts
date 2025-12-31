import twilio from 'twilio';

interface SMSOptions {
  to: string;
  message: string;
}

class SMSService {
  private client: any = null;
  private isConfigured: boolean = false;
  private fromPhone: string = '';

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && phoneNumber && 
        accountSid.trim() !== '' && authToken.trim() !== '' && phoneNumber.trim() !== '') {
      try {
        this.client = twilio(accountSid, authToken);
        this.fromPhone = phoneNumber;
        this.isConfigured = true;
        console.log('[SMSService] ✓ Twilio configured - SMS will be sent');
      } catch (error) {
        console.error('[SMSService] ✗ Twilio configuration failed:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('[SMSService] ⚠ Twilio credentials not found - SMS will be logged to console');
      console.log('[SMSService] Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
      this.isConfigured = false;
    }
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    const { to, message } = options;

    if (this.isConfigured && this.client) {
      // Real SMS sending via Twilio
      try {
        const result = await this.client.messages.create({
          body: message,
          from: this.fromPhone,
          to: to,
        });

        console.log(`[SMSService] ✓ SMS sent to ${to}: ${result.sid}`);
        return true;
      } catch (error: any) {
        console.error('[SMSService] ✗ Failed to send SMS:', error);
        if (error.code) {
          console.error(`[SMSService] Twilio error code ${error.code}: ${error.message}`);
        }
        
        // Fallback to console logging
        this.logSMSToConsole({ to, message });
        return false;
      }
    } else {
      // Placeholder mode - log to console
      this.logSMSToConsole({ to, message });
      return true;
    }
  }

  private logSMSToConsole(options: SMSOptions) {
    const { to, message } = options;
    
    console.log('\n' + '='.repeat(80));
    console.log('[SMSService] 📱 SMS (Console Mode - Add Twilio credentials to send real SMS)');
    console.log('='.repeat(80));
    console.log(`To:      ${to}`);
    console.log(`From:    ${this.fromPhone || '(Not configured)'}`);
    console.log('-'.repeat(80));
    console.log('Message:');
    console.log(message);
    console.log('='.repeat(80) + '\n');
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const smsService = new SMSService();
