/**
 * Shared configuration constants
 */

/**
 * Email addresses with permanent admin access and role-switching capabilities.
 * These users can switch between all roles for testing purposes.
 */
export const TESTING_ADMIN_EMAILS = [
  "frank.quesada@gmail.com",
  "binhaks@binhaklaw.com",
  "zoinertejada@gmail.com",
  "charliewhorton@gmail.com",
  "rjb@borgheselaw.com",
];

/**
 * Check if an email address belongs to a testing admin
 */
export function isTestingAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return TESTING_ADMIN_EMAILS.includes(email);
}
