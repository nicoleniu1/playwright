import { test, expect } from '@playwright/test'
import { adhocOverride } from '../../utils/helpers'
import { PUBLISH_HISTORY_URL, ONLINE_ORDERING_URL, PUBLISH_CONFIG_URL } from '../../utils/constants'


test.describe('publish history test suite 1', () => {
 test.use({ storageState: 'playwright/.auth/user1.json' })
 test('publish menu and verify the changes in publish history', async ({ page }) => {
   // 10 min timeout for the whole test - overkill but useful if publishing is slow
   test.setTimeout(600000)


   await adhocOverride(page)


   await page.goto(ONLINE_ORDERING_URL)


   // Close the set up checklist window if it's visible
   const closeButton = page.locator('[data-testid="header-close-button"]')


   // Wait for the button to be visible with a timeout
   await closeButton.waitFor({ state: 'visible', timeout: 25000 })


   // If the element is visible, perform the click
   if (await closeButton.isVisible()) {
     await closeButton.click()
   }


   //Test 1: Quick edit
   // Toggle OO page to not accept online orders, save to do a quick edit
   await page.getByText("Don't accept online orders").click()
   await page.getByRole('link', { name: 'Save' }).click()


   await page.goto(PUBLISH_HISTORY_URL)


   await page.waitForTimeout(15000)


   // Refresh the page to load the latest publishes
   await page.reload()


   // Verify the publish type is "Quick edit"
   const publishJobRow = page.locator('#publish-history-table-row-0')
   const type = publishJobRow.locator('td:nth-child(2)')
   await expect(type).toContainText('Quick edit')


   await page.locator('#publish-history-table-row-0').click()


   const publishedEntityRow = await page
     .locator('.border-default.border-b.md\\:hover\\:bg-gray-25.md\\:bg-gray-0.cursor-pointer')
     .first()


   // Drill into details page and verify there's accurate type of publish showing up -- "Quick edit"
   await publishedEntityRow.click()


   await page
     .locator('[data-testid="details-card-entity-type"]')
     .waitFor({ state: 'visible', timeout: 25000 })


   const typeLocator = page.getByTestId('details-page-type')
   await expect(typeLocator).toContainText('Quick edit')


   // Go to OO page again to snooze online orders temporarily, save to do a quick edit
   await page.goto(ONLINE_ORDERING_URL)
   await page.waitForLoadState('load')


   await page.getByText('Snooze online orders temporarily').click()


   await page.getByRole('link', { name: 'Save' }).click()


   // Do a full publish
   await page.goto(PUBLISH_CONFIG_URL)
   await page.getByRole('button', { name: 'Publish Selected Restaurants' }).click()


   await page.goto(PUBLISH_HISTORY_URL)
   await page.waitForLoadState('load')


   // Test 2: Select one date using the data filter and verify there's correct date returned
   // Go to publish history page and select date filter
   await page.getByTestId('publish-history-filter-date-picker-button').click()
   await page.getByRole('button', { name: 'Custom date' }).click()


   // Fill in the "Start date" field (id="date-input-33")
   const inputLocator1 = page.locator('#date-input-1')
   await inputLocator1.waitFor({ state: 'visible' })
   await inputLocator1.click() // Click to focus
   // Clear the existing value (if any)
   await inputLocator1.fill('') // Clear any pre-filled value
   // Type the new value (simulate typing)
   await inputLocator1.type('12/12/2024')
   // Fill in the "End date" field (id="date-input-35")
   const inputLocator2 = page.locator('#date-input-3')
   await inputLocator2.waitFor({ state: 'visible' })
   await inputLocator2.click() // Click to focus
   // Clear the existing value (if any)
   await inputLocator2.fill('') // Clear any pre-filled value
   // Type the new value (simulate typing)
   await inputLocator2.type('12/12/2024')


   // Apply the filter
   const buttonLocator = page.locator('button[data-testid="buttons-1"]')
   await buttonLocator.click()


   // Verify in returned results the date is 12/12/2024
   const publishJobRow1 = page.locator('#publish-history-table-row-0')
   const date = publishJobRow1.locator('td:nth-child(1)')
   await expect(date).toContainText('12/12/24')
 })
})