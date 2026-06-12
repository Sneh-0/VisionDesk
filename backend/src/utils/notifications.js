/**
 * Notification Service Placeholder
 * Integration point for SMS (Twilio), WhatsApp (Meta/Interakt), or Email.
 */

export const sendNotification = async (to, message, type = "sms") => {
  console.log(`[Notification System] Sending ${type} to ${to}: ${message}`);
  
  // Example Twilio Implementation:
  // if (type === 'sms') {
  //   await twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE, to });
  // }
  
  return { success: true, provider: "visiondesk-mock" };
};

export const notifyOrderReady = (customerName, mobileNo, orderId) => {
  const message = `Hello ${customerName}, your VisionDesk order #${orderId} is ready for pickup!`;
  return sendNotification(mobileNo, message, "sms");
};

export const notifyPointsEarned = (customerName, mobileNo, points) => {
  const message = `Congratulations ${customerName}! You earned ${points} loyalty points. Total points: available in your account.`;
  return sendNotification(mobileNo, message, "sms");
};
