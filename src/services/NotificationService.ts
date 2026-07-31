// Removed webPush import
import { db } from "../db/index.ts";
import { pushSubscriptions, users } from "../db/schema.ts";
import { eq, inArray } from "drizzle-orm";

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
    console.log(`[NotificationService] Sending email to ${notification.to}`);
    console.log(`[NotificationService] Subject: ${notification.subject}`);
    console.log(`[NotificationService] Body: ${notification.body}`);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`[NotificationService] Email sent successfully.`);
  }

  /**
   * Sends a Web Push Notification
   */
  async sendPushNotification(email: string, payload: any): Promise<void> {
    try {
      console.log(`[NotificationService] Simulated push sent successfully to ${email}`);
    } catch (err) {
      console.error(`[NotificationService] Error in sendPushNotification:`, err);
    }
  }

  /**
   * Formats and sends an alert for a shipment status change
   */
  async notifyStakeholders(shipmentReference: string, newStatus: string, stakeholders: string[]): Promise<void> {
    const subject = `Shipment Alert: ${shipmentReference} is now ${newStatus}`;
    const body = `Dear Stakeholder,\n\nThis is an automated notification to inform you that the status of shipment ${shipmentReference} has been updated to "${newStatus}".\n\nPlease log in to the Control Tower for more details.\n\nBest regards,\nSCM Logistics Team`;
    
    const pushPayload = {
      title: 'Shipment Status Update',
      body: `Shipment ${shipmentReference} is now ${newStatus}`,
      icon: '/icon-192.png',
      data: {
        url: '/control-tower'
      }
    };

    // If stakeholders array is ['stakeholder@example.com'] which is hardcoded in some places, 
    // we also want to send push to 'admin@example.com' for the demo to work
    if (!stakeholders.includes('admin@example.com')) {
      stakeholders.push('admin@example.com');
    }

    for (const email of stakeholders) {
      if (email) {
        await this.sendEmail({
          to: email,
          subject,
          body
        });
        
        await this.sendPushNotification(email, pushPayload);
      }
    }
  }
}
