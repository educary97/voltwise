// src/lib/agentConfig.ts
export interface SupermarketBenefit {
  supermarket: "Continente" | "Pingo Doce" | "Carrefour" | "Jumbo" | "Auchan" | "other";
  cashbackPercentage?: number; // e.g., 2.5 for 2.5% cashback
  fixedMonthlyEur?: number; // alternative: fixed amount like €5/month
  estimatedMonthlySpending?: number; // estimate of your monthly spending to calculate benefit
}

export interface AgentConfig {
  currentSupplier: string;
  currentPlan: string;
  currentMonthlyKwh: number;
  currentMonthlyCost: number;
  currentSupermarketBenefit?: SupermarketBenefit; // the cashback/discount on your current contract
  switchingThresholdEur: number;
  userName: string;
  userNif: string;
  userIban: string;
  userCpe: string;
  userEmail: string;
  userAddress: string;
  userPhone: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsappFrom: string;
  notifyWhatsappTo: string;
  resendApiKey: string;
  notifyToEmail: string;
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

function optional(key: string): string | undefined {
  return process.env[key];
}

export function getAgentConfig(): AgentConfig {
  // Parse optional supermarket benefit
  let currentSupermarketBenefit: SupermarketBenefit | undefined;
  const supermarketName = optional("CURRENT_SUPERMARKET_BENEFIT_SUPERMARKET");
  if (supermarketName && (supermarketName as any) in { Continente: 1, "Pingo Doce": 1, Carrefour: 1, Jumbo: 1, Auchan: 1, other: 1 }) {
    const cashbackPct = optional("CURRENT_SUPERMARKET_BENEFIT_CASHBACK_PERCENTAGE");
    const fixedAmount = optional("CURRENT_SUPERMARKET_BENEFIT_FIXED_MONTHLY_EUR");
    const spending = optional("CURRENT_SUPERMARKET_BENEFIT_MONTHLY_SPENDING");

    currentSupermarketBenefit = {
      supermarket: supermarketName as any,
      cashbackPercentage: cashbackPct ? parseFloat(cashbackPct) : undefined,
      fixedMonthlyEur: fixedAmount ? parseFloat(fixedAmount) : undefined,
      estimatedMonthlySpending: spending ? parseFloat(spending) : undefined,
    };
  }

  return {
    currentSupplier:      required("CURRENT_SUPPLIER"),
    currentPlan:          required("CURRENT_PLAN"),
    currentMonthlyKwh:    requiredNumber("CURRENT_MONTHLY_KWH"),
    currentMonthlyCost:   requiredNumber("CURRENT_MONTHLY_COST"),
    currentSupermarketBenefit,
    switchingThresholdEur: requiredNumber("SWITCHING_THRESHOLD_EUR"),
    userName:     required("USER_NAME"),
    userNif:      required("USER_NIF"),
    userIban:     required("USER_IBAN"),
    userCpe:      required("USER_CPE"),
    userEmail:    required("USER_EMAIL"),
    userAddress:  required("USER_ADDRESS"),
    userPhone:    required("USER_PHONE"),
    twilioAccountSid:    required("TWILIO_ACCOUNT_SID"),
    twilioAuthToken:     required("TWILIO_AUTH_TOKEN"),
    twilioWhatsappFrom:  required("TWILIO_WHATSAPP_FROM"),
    notifyWhatsappTo:    required("NOTIFY_WHATSAPP_TO"),
    resendApiKey:    required("RESEND_API_KEY"),
    notifyToEmail:   required("NOTIFY_TO_EMAIL"),
    agentApproveSecret: required("AGENT_APPROVE_SECRET"),
    appBaseUrl:         required("NEXT_PUBLIC_APP_URL"),
  };
}