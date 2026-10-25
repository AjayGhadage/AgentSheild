/**
 * Data Protection Service
 * Detects sensitive data patterns in text using regex detectors.
 * NOTE: Pattern-based detection has known limitations — it does not
 * identify all forms of PII or context-dependent sensitive data.
 */

const DETECTORS = [
  {
    name:    'api_key',
    label:   'API Key / Secret Token',
    pattern: /(?:api[_-]?key|secret|token|bearer)\s*[:=]\s*['"]?([A-Za-z0-9_\-\.]{20,})['"]?/gi,
  },
  {
    name:    'email',
    label:   'Email Address',
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  },
  {
    name:    'phone',
    label:   'Phone Number',
    pattern: /(?:\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g,
  },
  {
    name:    'credit_card',
    label:   'Credit Card Number',
    pattern: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
  },
  {
    name:    'aws_key',
    label:   'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name:    'private_key',
    label:   'Private Key / Certificate',
    pattern: /-----BEGIN\s(?:RSA\s|EC\s|OPENSSH\s)?PRIVATE KEY-----/g,
  },
  {
    name:    'jwt_token',
    label:   'JWT Token',
    pattern: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
  },
  {
    name:    'ip_address',
    label:   'IP Address (internal)',
    pattern: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
  },
  {
    name:    'ssn',
    label:   'US Social Security Number',
    pattern: /\b\d{3}[-–]\d{2}[-–]\d{4}\b/g,
  },
  {
    name:    'password_field',
    label:   'Password Field',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/gi,
  },
];

/**
 * Scan text for sensitive data patterns.
 * @returns {Array<{detector, label, count, redactedSample}>}
 */
export function detectSensitiveData(text) {
  const findings = [];
  for (const detector of DETECTORS) {
    const matches = text.match(detector.pattern);
    if (matches && matches.length > 0) {
      findings.push({
        detector:     detector.name,
        label:        detector.label,
        count:        matches.length,
        redactedSample: matches[0].replace(/./g, '*').slice(0, 20) + '...',
      });
    }
  }
  return findings;
}

/**
 * Redact sensitive patterns from text (replaces with [REDACTED]).
 */
export function redactSensitiveData(text) {
  let result = text;
  for (const detector of DETECTORS) {
    result = result.replace(detector.pattern, `[REDACTED:${detector.name}]`);
  }
  return result;
}

/**
 * Quick check: does the text contain any sensitive patterns?
 */
export function hasSensitiveData(text) {
  return DETECTORS.some((d) => d.pattern.test(String(text)));
}
