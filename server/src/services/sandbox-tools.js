/**
 * Sandboxed Tool Registry
 *
 * All tools execute in-process against synthetic data only.
 * No real shell execution, no real HTTP, no real database writes.
 */

export const REGISTERED_TOOLS = {
  read_public_document: {
    name:        'read_public_document',
    description: 'Reads a publicly available synthetic document.',
    sensitivity: 'low',
    execute: async ({ filename }) => ({
      content: `[PUBLIC DOC: ${filename}] This is synthetic public content for demonstration. No sensitive data.`,
      bytesRead: 128,
    }),
  },

  read_protected_file: {
    name:        'read_protected_file',
    description: 'Reads a protected file from the synthetic secure vault.',
    sensitivity: 'high',
    execute: async ({ path }) => ({
      content: `[PROTECTED FILE: ${path}] Synthetic protected content. Contains: DEMO_SECRET=syn_demo_key_[REDACTED]`,
      classification: 'CONFIDENTIAL',
    }),
  },

  query_demo_database: {
    name:        'query_demo_database',
    description: 'Runs a read query against the synthetic demo database.',
    sensitivity: 'medium',
    execute: async ({ sql }) => {
      // Reject any obviously dangerous SQL patterns
      const dangerous = /drop|truncate|delete|insert|update|exec|xp_|;/i;
      if (dangerous.test(sql)) {
        throw new Error('Sandbox rejected unsafe SQL pattern');
      }
      return {
        rows: [
          { id: 'user_001', name: 'Demo User', email: 'd***@example.com' },
          { id: 'user_002', name: 'Test Account', email: 't***@example.com' },
        ],
        rowCount: 2,
        note: 'Synthetic data only',
      };
    },
  },

  send_simulated_http_request: {
    name:        'send_simulated_http_request',
    description: 'Simulates an outbound HTTP request (no real network call).',
    sensitivity: 'critical',
    execute: async ({ url, method = 'GET', body = null }) => {
      // This should normally be BLOCKED — if it reaches here, log it clearly
      return {
        simulated: true,
        url,
        method,
        statusCode: 200,
        response:   '[SIMULATED ONLY — no real network request was made]',
        warning:    'This tool should be blocked by AgentShield in most policies.',
      };
    },
  },

  write_demo_file: {
    name:        'write_demo_file',
    description: 'Writes to a synthetic file in the sandboxed workspace.',
    sensitivity: 'medium',
    execute: async ({ filename, content }) => ({
      written:   true,
      filename,
      bytesWritten: String(content || '').length,
      path:      `/sandbox/workspace/${filename}`,
      note:      'Synthetic file system — no real file written.',
    }),
  },
};

export function getTool(name) {
  return REGISTERED_TOOLS[name] || null;
}

export function listTools() {
  return Object.values(REGISTERED_TOOLS).map(({ name, description, sensitivity }) => ({
    name, description, sensitivity,
  }));
}
