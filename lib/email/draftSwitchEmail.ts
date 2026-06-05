import { AgentConfig } from '../agentConfig';

export interface DraftEmail {
  to: string;
  subject: string;
  body: string;
  userFields: {
    cpe: string;
    monthlyKwh: number;
    contractedPower: number;
  };
}

/**
 * Generate draft email for switching suppliers
 */
export function generateSwitchEmail(
  userInfo: AgentConfig,
  newSupplier: string,
  newPlan: string,
  newCost: number,
  supplierEmail: string
): DraftEmail {
  const body = `Dear ${newSupplier} Team,

I would like to switch my electricity contract to your ${newPlan} plan.

CURRENT CONTRACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Supplier:     ${userInfo.currentSupplier}
Current Plan:         ${userInfo.currentPlan}
Contract Point (CPE): ${userInfo.userCpe}
Monthly Consumption:  ${userInfo.currentMonthlyKwh} kWh
Contracted Power:     6.9 kVA
Meter Number:         [PLEASE FILL IN]
Account Number:       [PLEASE FILL IN]

NEW PLAN DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan Name:            ${newPlan}
Estimated Monthly:    €${newCost.toFixed(2)}

PERSONAL INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:                 ${userInfo.userName}
Email:                ${userInfo.userEmail}
Phone:                ${userInfo.userPhone}
NIF:                  ${userInfo.userNif}
Address:              ${userInfo.userAddress}

Please confirm availability and provide next steps for the contract switch.

Best regards,
${userInfo.userName}`;

  return {
    to: supplierEmail,
    subject: `Switch to ${newPlan} - CPE ${userInfo.userCpe}`,
    body,
    userFields: {
      cpe: userInfo.userCpe,
      monthlyKwh: userInfo.currentMonthlyKwh,
      contractedPower: 6.9,
    },
  };
}

/**
 * Format email as HTML for display in UI
 */
export function formatEmailAsHtml(email: DraftEmail): string {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h3>Draft Email</h3>
  
  <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
    <strong>To:</strong> ${email.to}<br/>
    <strong>Subject:</strong> ${email.subject}
  </div>
  
  <div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap;">
${email.body}
  </div>
  
  <div style="margin-top: 15px; font-size: 12px; color: #666;">
    <strong>Note:</strong> Please fill in the [BRACKETED] fields before sending.
  </div>
</div>
  `;
}
