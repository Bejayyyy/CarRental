// emailService.js - Place this in your services folder
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve the Email Service base URL dynamically so it works across different networks
const resolveEmailServiceBaseUrl = () => {
  // 1) Explicit override via Expo public env (best for production)
  const explicitUrl = process.env.EXPO_PUBLIC_EMAIL_SERVICE_URL;
  if (explicitUrl && typeof explicitUrl === 'string') {
    return explicitUrl.replace(/\/$/, '');
  }

  // 2) Determine host from Expo dev server info (works in Expo Go)
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  // hostUri examples: "192.168.1.5:19000", "192.168.1.5:8081"
  const hostFromExpo = hostUri ? hostUri.split(':')[0] : undefined;

  // 3) For web builds, prefer the current origin host
  const webHost = typeof window !== 'undefined' && window.location ? window.location.hostname : undefined;

  const host = hostFromExpo || webHost || 'localhost';

  // Allow port override; default to 3002 to match prior setup
  const port = process.env.EXPO_PUBLIC_EMAIL_SERVICE_PORT || '3002';

  // Special case for Android emulator (not Expo Go on device). Keeping here for completeness.
  const finalHost = Platform.OS === 'android' && host === 'localhost' ? '10.0.2.2' : host;

  return `http://${finalHost}:${port}`;
};

const EMAIL_SERVICE_URL = resolveEmailServiceBaseUrl();

class EmailService {
  
  static async sendStatusUpdateEmail(booking, newStatus) {
    try {
      // Prepare email data
      const emailData = {
        customer_email: booking.customer_email,
        customer_name: booking.customer_name,
        bookingId: booking.id,
        vehicleMake: booking.vehicles?.make || 'Vehicle',
        vehicleModel: booking.vehicles?.model || '',
        vehicleYear: booking.vehicles?.year || '',
        variantColor: booking.vehicle_variants?.color || '',
        rental_start_date: booking.rental_start_date,
        rental_end_date: booking.rental_end_date,
        pickup_location: booking.pickup_location || '',
        total_price: parseFloat(booking.total_price || 0),
        oldStatus: booking.status,
        newStatus: newStatus,
        updated_date: new Date().toISOString()
      };

      // Send to email service
      const response = await fetch(`${EMAIL_SERVICE_URL}/api/send-status-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Status update email sent successfully');
        return { success: true, message: 'Email sent successfully' };
      } else {
        console.error('Failed to send email:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error: 'Network error or email service unavailable' };
    }
  }

  // Test if email service is running
  static async checkEmailService() {
    try {
      const response = await fetch(`${EMAIL_SERVICE_URL}/api/health`);
      const result = await response.json();
      return result.status === "Email service is running";
    } catch (error) {
      console.error('Email service health check failed:', error);
      return false;
    }
  }
}

export default EmailService;