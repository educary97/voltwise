// src/lib/agentConfig.ts
// Reads all agent-related env vars with type safety and clear errors

export interface AgentConfig {
  // Current plan
  currentSupplier: string;
  currentPlan: string;
  currentMonthlyKwh: number;
  currentMonthlyCost: number;
  switchingThresholdEur: number;

  // User personal details (for supplier email draft)
  userName: string;
  userNif: string;
  userIban: string;
  userCpe: string;
  userEmail: string;
  userAddress: string;
  userPhone: string;

  // Notifications - Twilio WhatsApp
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsappFrom: string; // e.g. "whatsapp:+14155238886"
  notifyWhatsappTo: string;   // e.g. "whatsapp:+351912345678"

  // Email sending (Resend) - for sending to supplier
  resendApiKey: string;
  notifyToEmail: string;      // your personal email for the approval notification fallback

  // Security
  agentApproveSecret: string;
  appBaseUrl: string;
}

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function requiredNumber(key: string): number {
  const val = required(key);
  const num = parseFloat(val);
  if (isNaN(num)) throw new Error(`Env var ${key} must be a number, got: ${val}`);
  return num;
}

export function getAgentConfig(): AgentConfig {
  return {
    currentSupplier: required("CURRENT_SUPPLIER"),
    currentPlan: required("CURRENT_PLAN"),
    currentMonthlyKwh: requiredNumber("CURRENT_MONTHLY_KWH"),
    currentMonthlyCost: requiredNumber("CURRENT_MONTHLY_COST"),
    switchingThresholdEur: requiredNumber("SWITCHING_THRESHOLD_EUR"),

    userName: required("USER_NAME"),
    userNif: required("USER_NIF"),
    userIban: required("USER_IBAN"),
    userCpe: required("USER_CPE"),
    userEmail: required("USER_EMAIL"),
    userAddress: required("USER_ADDRESS"),
    userPhone: required("USER_PHONE"),

    twilioAccountSid: required("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: required("TWILIO_AUTH_TOKEN"),
    twilioWhatsappFrom: required("TWILIO_WHATSAPP_FROM"),
    notifyWhatsappTo: required("NOTIFY_WHATSAPP_TO"),

    resendApiKey: required("RESEND_API_KEY"),
    notifyToEmail: required("NOTIFY_TO_EMAIL"),

    agentApproveSecret: required("AGENT_APPROVE_SECRET"),
    appBaseUrl: required("NEXT_PUBLIC_APP_URL"),
  };
}
