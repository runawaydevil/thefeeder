/**
 * SMTP configuration validation result
 */
export interface SmtpValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns true if email is valid
 * 
 * @example
 * isValidEmail('user@example.com'); // true
 * isValidEmail('invalid-email'); // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : "";
}

/**
 * Extract domain from hostname
 */
function extractHostDomain(host: string): string {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];
  // Get last two parts of domain (e.g., gmail.com from smtp.gmail.com)
  const parts = hostWithoutPort.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostWithoutPort;
}

/**
 * Validate SMTP configuration
 * Checks environment variables and returns validation result
 * 
 * @returns Validation result with errors and warnings
 * 
 * @example
 * const validation = validateSmtpConfig();
 * if (!validation.valid) {
 *   console.error('SMTP config invalid:', validation.errors);
 * }
 */
export function validateSmtpConfig(): SmtpValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check SMTP_HOST
  if (!process.env.SMTP_HOST) {
    errors.push("SMTP_HOST is not defined - email sending will use console transport");
  }
  
  // Check SMTP_PORT
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    const port = parseInt(process.env.SMTP_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`SMTP_PORT is invalid: ${process.env.SMTP_PORT} - must be a number between 1 and 65535`);
    }
  }
  
  // Check SMTP_USER and SMTP_PASS (if SMTP_HOST is defined)
  if (process.env.SMTP_HOST) {
    if (!process.env.SMTP_USER) {
      warnings.push("SMTP_USER is not defined - authentication may fail");
    }
    if (!process.env.SMTP_PASS) {
      warnings.push("SMTP_PASS is not defined - authentication may fail");
    }
  }
  
  // Check SMTP_FROM
  if (!process.env.SMTP_FROM) {
    warnings.push("SMTP_FROM is not defined - will use default 'noreply@thefeeder.com'");
  } else if (!isValidEmail(process.env.SMTP_FROM)) {
    errors.push(`SMTP_FROM is not a valid email address: ${process.env.SMTP_FROM}`);
  }
  
  // Check domain mismatch (warning only)
  if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
    const fromDomain = extractDomain(process.env.SMTP_FROM);
    const hostDomain = extractHostDomain(process.env.SMTP_HOST);
    
    if (fromDomain && hostDomain && fromDomain !== hostDomain) {
      warnings.push(
        `FROM domain (${fromDomain}) differs from SMTP host domain (${hostDomain}) - ` +
        `this may affect deliverability. Consider using an email address from ${hostDomain}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize email address to prevent injection attacks
 * Removes newlines and dangerous characters
 * 
 * @param email - Email address to sanitize
 * @returns Sanitized email address
 */
export function sanitizeEmailAddress(email: string): string {
  return email.replace(/[\r\n]/g, "").trim();
}

/**
 * Sanitize subject line to prevent header injection
 * Removes newlines that could be used for injection
 * 
 * @param subject - Subject line to sanitize
 * @returns Sanitized subject line
 */
export function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, " ").trim();
}
