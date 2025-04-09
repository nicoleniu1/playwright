import { request, chromium } from '@playwright/test' // import Playwright modules
import { PREPROD_AUTH_API, PREPROD_HOMEPAGE_URL, PREPROD_LOGIN_URL } from '../utils/constants'


export default async function globalSetup() {
 const email = process.env.TEST_USER_1_EMAIL || ''
 const password = process.env.TEST_USER_1_PASSWORD || ''
 const authFile = 'playwright/.auth/user1.json'


 // Launch a Chromium browser
 const browser = await chromium.launch()
 const page = await browser.newPage()
 await page.setViewportSize({ width: 1500, height: 1000 })


 // Navigate to the login page
 await page.goto(PREPROD_LOGIN_URL)


 // Fill the login form with email and password
 await page.locator('id=username').first().fill(email)
 await page.getByText('Continue', { exact: true }).first().click()


 await page.locator('id=password').first().fill(password)
 await page.getByRole('button', { name: 'Continue' }).first().click()


 // Handle the "Remind me later" prompt if visible
 const remindMeLater = page.getByRole('button', { name: 'Remind me later' })
 if (await remindMeLater.isVisible()) {
   await remindMeLater.click()
 }


 // Wait for the homepage to load
 await page.goto(PREPROD_HOMEPAGE_URL)
 await page.waitForURL(/restaurants\/admin\/home/, { timeout: 90000 })


 // Save the storage state (authentication info) to a JSON file
 await page.context().storageState({ path: authFile })


 // Optionally, make an API call to get an access token (if required)
 const context = await request.newContext()
 const authResponse = await context.post(PREPROD_AUTH_API, {
   data: {
     clientId: process.env.API_CLIENT_ID,
     clientSecret: process.env.API_CLIENT_SECRET,
     userAccessType: 'TOAST_MACHINE_CLIENT'
   }
 })


 // Extract the access token and save it in an environment variable
 const responseJson = await authResponse.json()
 const accessToken = responseJson.token.accessToken
 if (accessToken) {
   process.env.MACHINE_TOKEN = accessToken
 }


 // Close the browser after completing the setup
 await browser.close()
}