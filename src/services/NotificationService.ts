export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
}

export class NotificationService {
  /**
   * Simulates sending an email notification
   */
  async sendEmail(notification: EmailNotification): Promise<void> {
    // In a real application, this would integrate with SendGrid, AWS SES, SMTP, etc.
    console.log(`[NotificationService] Sending email to ${notification.to}`);
    console.log(`[NotificationService] Subject: ${notification.subject}`);
    console.log(`[NotificationService] Body: ${notification.body}`);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`[NotificationService] Email sent successfully.`);
  }

  /**
   * Formats and sends an alert for a shipment status change
   */
  async notifyStakeholders(shipmentReference: string, newStatus: string, stakeholders: string[]): Promise<void> {
    const subject = `Shipment Alert: ${shipmentReference} is now ${newStatus}`;
    const body = `Dear Stakeholder,\n\nThis is an automated notification to inform you that the status of shipment ${shipmentReference} has been updated to "${newStatus}".\n\nPlease log in to the Control Tower for more details.\n\nBest regards,\nSCM Logistics Team`;

    for (const email of stakeholders) {
      if (email) {
        await this.sendEmail({
          to: email,
          subject,
          body
        });
      }
    }
  }
}
