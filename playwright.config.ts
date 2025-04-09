import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
export const TEST_RAIL_IGNORE_ANNOTATION = 'testrailignore'


dotenv.config()


const testRailOptions = {
 // Whether to add <properties> with all annotations; default is false
 embedAnnotationsAsProperties: true,
 // Where to put the report.
 outputFile: './test-results/test-results.xml'
}


/**
* See https://playwright.dev/docs/test-configuration.
*/
export default defineConfig({
 testDir: './playwright/tests',
 /* Run tests in files in parallel */
 fullyParallel: false,
 // Path to your authorization setup file
 globalSetup: require.resolve('./playwright/tests/auth.setup.ts'),
 /* Fail the build on CI if you accidentally left test.only in the source code. */
 forbidOnly: !!process.env.CI,
 /* Retry on CI only */
 retries: process.env.CI ? 0 : 2,
 /* Opt out of parallel tests on CI. */
 workers: process.env.CI ? 1 : undefined,
 /* Reporter to use. See https://playwright.dev/docs/test-reporters */
 reporter: [['list'], ['html'], ['junit', testRailOptions]],
 /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
 use: {
   /* Base URL to use in actions like `await page.goto('/')`. */
   // baseURL: 'http://127.0.0.1:3000',
   // Use the storage state for authentication across tests
   storageState: 'playwright/.auth/user1.json',
   /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
   actionTimeout: 0,
   headless: false,
   video: 'retain-on-failure',
   /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
   trace: 'retain-on-failure'
 },


 // Exclude the LSP-CRUD.spec.ts test file right now because we have a bug that make this test to fail
 testMatch: [
   '!**/LSP-CRUD.spec.ts' // Exclude a specific test file
 ],


 /* Configure projects for major browsers */
 projects: [
   { name: 'setup', testMatch: /.*\.setup\.ts/ },


   // Project for Chrome
   {
     name: 'chromium',
     testMatch: [
       '**/e2e-filter.spec.ts', // Match this file for Chrome
       '**/quickedit.spec.ts', // Match this file for Chrome
       '**/fastconfig.spec.ts' // Match this file for Chrome
     ],
     use: {
       ...devices['Desktop Chrome'],
       viewport: { width: 1920, height: 1080 },
       video: 'retain-on-failure'
     }
   },


   // Project for firefox
   {
     name: 'firefox',
     use: {
       browserName: 'firefox', // Use Firefox browser
       viewport: { width: 1280, height: 720 }, // Optional: Set viewport size
       video: 'retain-on-failure' // Retain video on failure (optional)
     }
   },


   // Project for Safari
   {
     name: 'webkit', // Webkit is the engine for Safari
     use: {
       browserName: 'webkit', // Use Safari (Webkit engine)
       viewport: { width: 1280, height: 720 }, // Optional: Set viewport size
       video: 'retain-on-failure' // Retain video on failure (optional)
     }
   }
 ]
})