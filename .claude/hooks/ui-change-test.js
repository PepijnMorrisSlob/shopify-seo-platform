#!/usr/bin/env node
/**
 * UI Change Test Hook
 * Triggers after Edit/Write on frontend files
 * Outputs a reminder for Claude to run Playwright visual tests
 */

const fs = require('fs');
const path = require('path');

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    // Check if this is a frontend UI file
    const isUIFile = filePath.includes('frontend/src') &&
      (filePath.endsWith('.tsx') ||
       filePath.endsWith('.css') ||
       filePath.endsWith('.ts'));

    if (isUIFile) {
      // Log the change
      const logFile = path.join(data.cwd, '.claude', 'ui-changes.log');
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} | UI Changed: ${filePath}\n`;

      fs.appendFileSync(logFile, logEntry);

      // Output reminder for Claude (this gets fed back as context)
      console.log(JSON.stringify({
        message: `UI file modified: ${path.basename(filePath)}. Consider running Playwright visual test on localhost:4177 to verify changes.`,
        file: filePath,
        timestamp: timestamp
      }));
    }

    process.exit(0);
  } catch (err) {
    // Silent fail - don't block the edit
    process.exit(0);
  }
});
