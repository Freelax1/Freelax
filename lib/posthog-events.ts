/** Canonical PostHog event names for Freelax product analytics */
export const Events = {
  USER_LOGGED_IN: 'user_logged_in',
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_OUT: 'user_logged_out',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',

  ONBOARDING_COMPLETED: 'onboarding_completed',
  PROFILE_UPDATED: 'profile_updated',
  LOGO_UPLOADED: 'logo_uploaded',
  LOGO_REMOVED: 'logo_removed',

  CLIENT_CREATED: 'client_created',
  CLIENT_UPDATED: 'client_updated',
  CLIENT_DELETED: 'client_deleted',
  CLIENT_STATUS_CHANGED: 'client_status_changed',

  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  IR35_ASSESSMENT_SAVED: 'ir35_assessment_saved',

  INVOICE_CREATED: 'invoice_created',
  INVOICE_UPDATED: 'invoice_updated',
  INVOICE_DELETED: 'invoice_deleted',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_CHASED: 'invoice_chased',
  INVOICE_MARKED_PAID: 'invoice_marked_paid',
  INVOICE_STATUS_UPDATED: 'invoice_status_updated',
  INVOICE_EXPORTED: 'invoice_exported',
  INVOICE_PDF_GENERATED: 'invoice_pdf_generated',
  INVOICE_PUBLIC_LINK_CREATED: 'invoice_public_link_created',
  INVOICE_PAYMENT_LINK_CREATED: 'invoice_payment_link_created',
  INVOICE_PAYMENT_RECEIVED: 'invoice_payment_received',
  INVOICE_RECURRING_TEMPLATE_CREATED: 'invoice_recurring_template_created',
  INVOICE_RECURRING_GENERATED: 'invoice_recurring_generated',
  INVOICES_MARKED_OVERDUE: 'invoices_marked_overdue',

  QUOTE_CREATED: 'quote_created',
  QUOTE_UPDATED: 'quote_updated',
  QUOTE_DELETED: 'quote_deleted',
  QUOTE_SENT: 'quote_sent',
  QUOTE_STATUS_UPDATED: 'quote_status_updated',
  QUOTE_PDF_GENERATED: 'quote_pdf_generated',
  QUOTE_RESPONDED: 'quote_responded',
  QUOTE_CONVERTED_TO_INVOICE: 'quote_converted_to_invoice',
  QUOTES_MARKED_EXPIRED: 'quotes_marked_expired',

  EXPENSE_CREATED: 'expense_created',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_DELETED: 'expense_deleted',

  MILEAGE_ENTRY_ADDED: 'mileage_entry_added',
  MILEAGE_ENTRY_DELETED: 'mileage_entry_deleted',

  TAX_POT_ENTRY_ADDED: 'tax_pot_entry_added',
  TAX_POT_ENTRY_DELETED: 'tax_pot_entry_deleted',
  TAX_PACK_EXPORTED: 'tax_pack_exported',

  HMRC_CONNECT_STARTED: 'hmrc_connect_started',
  HMRC_CONNECTED: 'hmrc_connected',
  HMRC_DISCONNECTED: 'hmrc_disconnected',

  ACCOUNTANT_INVITE_SENT: 'accountant_invite_sent',
  ACCOUNTANT_INVITE_REVOKED: 'accountant_invite_revoked',
  ACCOUNTANT_INVITE_ACCEPTED: 'accountant_invite_accepted',

  STRIPE_CHECKOUT_STARTED: 'stripe_checkout_started',
  STRIPE_PORTAL_OPENED: 'stripe_portal_opened',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  AI_TAX_QA_USED: 'ai_tax_qa_used',
  AI_MONTHLY_INSIGHT_USED: 'ai_monthly_insight_used',
  AI_INVOICE_ASSIST_USED: 'ai_invoice_assist_used',
  AI_IR35_EXPLAIN_USED: 'ai_ir35_explain_used',
  AI_SA_NARRATIVE_USED: 'ai_sa_narrative_used',
  AI_SCAN_RECEIPT_USED: 'ai_scan_receipt_used',

  PLAN_LIMIT_CHECKED: 'plan_limit_checked',
} as const

export type PostHogEventName = (typeof Events)[keyof typeof Events]
