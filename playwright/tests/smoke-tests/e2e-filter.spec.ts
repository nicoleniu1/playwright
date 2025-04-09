import { test, expect, request } from '@playwright/test'
import {
 createMenuConfig,
 doFullPublishAndGetPublishJob,
 adhocOverride,
 getCurrentDateString
} from '../../utils/helpers'
import { PUBLISH_HISTORY_URL } from '../../utils/constants'


test.describe('publish history test suite 1', () => {
 test.use({ storageState: 'playwright/.auth/user1.json' })
 test('publish menu and verify the changes in publish history', async ({ page }) => {
   // 10 min timeout for the whole test - overkill but useful if publishing is slow
   test.setTimeout(600000)
   const TEST_USER_GUID = 'c93e6c77-34f5-4d26-bae9-b3b6ae63eee9'
   const TEST_RESTAURANT_GUID = '6efb8b77-8b45-426c-bb8c-b3e1d27823d5'
   const TEST_RESTAURANT_SET_LEAF_GUID = '9e3fcd6a-1a13-427c-bb82-77ef686abcb5'
   const TEST_MGMT_SET_GUID = 'd166373f-7bbb-430a-9419-e04f63bc91b3'


   const headers = {
     headers: {
       'Toast-Restaurant-External-ID': TEST_RESTAURANT_GUID,
       'Toast-User-Guid': TEST_USER_GUID,
       'Toast-Management-Set-Guid': TEST_MGMT_SET_GUID,
       'Toast-Restaurant-Set-Guid': TEST_RESTAURANT_SET_LEAF_GUID,
       Authorization: `Bearer ${process.env.MACHINE_TOKEN}`
     }
   }


   const context = await request.newContext()


   // do a full publish to start from a clean state
   await doFullPublishAndGetPublishJob(context, headers, {
     userGuid: TEST_USER_GUID
   })


   // create menu config
   const menu = await createMenuConfig(context, headers, createMenuRequestBody())


   // do a full publish
   const publishJobId = await doFullPublishAndGetPublishJob(context, headers, {
     userGuid: TEST_USER_GUID
   })


   await page.goto(PUBLISH_HISTORY_URL)
   await adhocOverride(page)


   //close the set up checklist window if it's visible
   const closeButton = page.locator('[data-testid="header-close-button"]')


   // Wait for the button to be visible with a timeout
   await closeButton.waitFor({ state: 'visible', timeout: 15000 })


   // If the element is visible, perform the click
   if (await closeButton.isVisible()) {
     await closeButton.click()
   }


   const entityType = 'Menu'
   const entityId = menu.guid


   await page.getByTestId(`publish-history-table-row-${publishJobId}`).click()
   const publishedEntityRow = page.getByTestId(
     `publish-history-changes-table-row-${entityType}_${entityId}`
   )


   // verify action
   const actionCol = publishedEntityRow.locator('td:nth-child(1)')


   //Use the loop function to keep refreshing the page until the latest publish is showing up
   //Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries = 10 // 10 * 8 seconds = 80 seconds max retry time
   let retries = 0


   while (retries < maxRetries) {
     // Check if the element has the expected text
     try {
       //choose the create LSP log entry
       //click on first row of publish history page
       await page.locator('#publish-history-table-row-0').click()
       // verify action "CREATED"
       await expect(actionCol).toHaveText('CREATED', { timeout: 5000 }) // Wait for the text
       console.log('Text found: "CREATED"')
       break // Exit the loop once the condition is met
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page.reload() // Reload the page
       await page.waitForTimeout(8000) // Wait for 8 seconds before the next check
       retries++ // Increment the retry count
     }
   }


   // verify entity type
   const entityTypeCol = publishedEntityRow.locator('td:nth-child(2)')
   await expect(entityTypeCol).toHaveText('Menu')
   // verify entity
   const entityCol = publishedEntityRow.locator('td:nth-child(3)')
   await expect(entityCol).toHaveText('Playwright Test Menu')


   // drill into details page
   await publishedEntityRow.click()
   // verify header
   await expect(page.getByTestId('details-page-author')).toHaveText('User1 Test')
   await expect(page.getByTestId('details-page-location-name')).toHaveText("Mama Speenah's")
   await expect(page.getByTestId('details-page-type')).toHaveText('Full publish')
   await expect(page.getByTestId('config-template-title')).toContainText(
     await getCurrentDateString()
   )


   // verify the top section of details card
   await expect(page.getByTestId('details-card-entity-type')).toHaveText('Menu')
   await expect(page.getByTestId('details-card-entity')).toHaveText('Playwright Test Menu')
   await expect(page.getByTestId('details-card-action')).toHaveText('CREATED')
   await expect(page.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify the details table
   await expect(page.getByTestId('details-table')).toBeVisible()
   const detailsTableRow = page.getByTestId('details-table-body-row-Description')
   await expect(detailsTableRow.getByTestId('details-table-body-Description_name')).toHaveText(
     'Description'
   )
   await expect(detailsTableRow.getByTestId('details-table-body-Description_new')).toHaveText(
     'My Test Menu'
   )


   // do filtering based on date
   await page.goto(PUBLISH_HISTORY_URL)


   // Create a new Date object for the current date
   const today = new Date()


   // Extract the day, month, and year
   const day = today.getDate() // getDate() returns the day of the month
   const month = today.getMonth() + 1 // getMonth() returns the month (0-based, so add 1)
   const year = today.getFullYear() // getFullYear() returns the year in 4 digits


   // Extract the last two digits of the year
   const shortYear = year.toString().slice(-2)


   // Format the date as dd/mm/yy but without leading zeros
   const formattedDate = `${month}/${day}/${shortYear}`


   //apply filter
   await page.getByTestId('publish-history-filter-date-picker-button').click()
   await page.getByText('Today').click()


   // verify the filtered out date is today
   const publishJobRow = page.getByTestId(`publish-history-table-row-${publishJobId}`)
   const time = publishJobRow.locator('td:nth-child(1)')
   await expect(time).toContainText(formattedDate)


   // verify action
   await page.getByTestId(`publish-history-table-row-${publishJobId}`).click()
   await expect(actionCol).toHaveText('CREATED')
   // verify entity type
   await expect(entityTypeCol).toHaveText('Menu')
   // verify entity
   await expect(entityCol).toHaveText('Playwright Test Menu')


   // do filtering based on entity type
   await page.goto(PUBLISH_HISTORY_URL)


   //apply filter -- "menu"
   await page.getByTestId('publish-history-filter-entity-types-selector-button').click()
   await page.getByTestId('publish-history-filter-entity-types-selector-search').fill('Menu')
   await page.getByTestId('selectMultipleListOptionsContainer-option-0').click()


   // Hide the overlay by modifying its CSS
   await page
     .locator('[data-testid="overlay-select-panel"]')
     .evaluate((el) => (el.style.display = 'none'))


   await page.getByTestId('publish-history-filter-desktop-reset-button').click()


   // verify action
   await page.getByTestId(`publish-history-table-row-${publishJobId}`).click()
   await expect(actionCol).toHaveText('CREATED')
   // verify filter out entity type is menu
   await expect(entityTypeCol).toHaveText('Menu')
   // verify entity
   await expect(entityCol).toHaveText('Playwright Test Menu')


   await page.reload() // Reload the page


   //apply filter -- "Prep Station"
   await page.getByTestId('publish-history-filter-entity-types-selector-button').click()
   await page
     .getByTestId('publish-history-filter-entity-types-selector-search')
     .fill('Prep Station')
   await page.getByTestId('selectMultipleListOptionsContainer-option-0').click()


   // Hide the overlay by modifying its CSS
   await page
     .locator('[data-testid="overlay-select-panel"]')
     .evaluate((el) => (el.style.display = 'none'))


   await page.getByTestId('publish-history-filter-entity-types-selector-button').click()


   // verify nothing returned
   await expect(page.getByTestId('publish-history-table-empty-state')).toBeVisible({
     timeout: 30000
   })
 })
})


const createMenuRequestBody = () => {
 return [
   {
     name: 'Playwright Test Menu',
     ordinal: null,
     menuGroupMasterIds: ['300000001556386138', '300000001556386140'],
     menuGroupGuids: [],
     description: 'My Test Menu',
     visibility: {
       visibility: 'ALL',
       orderableOnline: 'YES',
       grubhubOrderable: 'YES',
       posVisible: true,
       kioskVisible: false,
       onlineOrderingVisible: true,
       orderingPartnerVisible: true
     },
     pointOfSale: {
       color: -1,
       shortName: 'Menu POS name',
       barcodeEmbeddedAmountType: 'NONE',
       showOnKiosk: false
     },
     taxes: {
       taxInclusionOption: 'TAX_NOT_INCLUDED',
       taxRates: [],
       diningOptionTaxation: 'NO_EFFECT',
       inheritTaxRates: true
     },
     image: {
       imagePath: null,
       imageHeightWidthRatio: null
     },
     collapseModifierPrices: {
       collapseModifierPrices: false,
       inheritCollapseModifierPrices: true
     },
     inventory: {
       tareWeight: 0.0,
       unitOfMeasure: 'UNSPECIFIED'
     },
     availability: {
       alwaysAvailable: true
     },
     discountable: true,
     excludedFromRewards: false,
     prepStationMasterIds: [],
     prepSequenceMasterId: 'null',
     salesCategoryMasterId: 'null'
   }
 ]
}