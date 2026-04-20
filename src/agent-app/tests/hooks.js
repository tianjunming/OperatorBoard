/**
 * Playwright Test Hooks
 * Global setup and teardown
 */
import { test as setup } from '@playwright/test';
import { dbHelper } from './helpers/dbHelper.js';

setup('global setup', async () => {
  // Test environment setup
  console.log('Setting up test environment...');
});

setup('global teardown', async () => {
  // Clean up
  await dbHelper.closePool();
  console.log('Test environment cleaned up');
});
