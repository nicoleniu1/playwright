import { test, expect, request } from '@playwright/test'
import { createMenuConfig, doFullPublishAndGetPublishJob, adhocOverride } from '../../utils/helpers'
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


   // drill into publish history details page and go to the newly created menu page
   await publishedEntityRow.click()
   const page1Promise = page.waitForEvent('popup')
   await page.getByTestId('details-card-config-url').click()
   const page1 = await page1Promise


   //update the menu name, save and publish the changes, and go back to publish history page
   await page1.getByLabel('Name', { exact: true }).click()
   await page1.getByLabel('Name', { exact: true }).fill('Playwright Test Menu update')
   await page1.getByRole('link', { name: 'Save' }).click()
   await page1.getByRole('link', { name: 'Publish Now' }).click()


   await page1.getByTestId('publish-history-link').click()


   const publishedEntityRow1 = page1.getByTestId(
     `publish-history-changes-table-row-${entityType}_${entityId}`
   )
   const actionCol1 = publishedEntityRow1.locator('td:nth-child(1)')


   //use the loop function to keep refreshing the page until the latest publish is showing up
   //Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries = 10 // 10 * 5 seconds = 50 seconds max retry time
   let retries = 0


   while (retries < maxRetries) {
     // Check if the element has the expected text
     try {
       // click on first row of publish history page
       await page1.locator('#publish-history-table-row-0').click()
       // verify action "UPDATED"
       await expect(actionCol1).toHaveText('UPDATED', { timeout: 5000 }) // Wait for the text
       console.log('Text found: "UPDATED"')
       break // Exit the loop once the condition is met
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page1.reload() // Reload the page
       await page1.waitForTimeout(5000) // Wait for 5 seconds before the next check
       retries++ // Increment the retry count
     }
   }


   // verify entity type
   const entityTypeCol1 = publishedEntityRow1.locator('td:nth-child(2)')
   await expect(entityTypeCol1).toHaveText('Menu')
   // verify entity name is updated correctly
   const entityCol1 = publishedEntityRow1.locator('td:nth-child(3)')
   await expect(entityCol1).toHaveText('Playwright Test Menu update')
   // drill into details page
   await publishedEntityRow1.click()
   // verify the top section of details card
   await expect(page1.getByTestId('details-card-entity-type')).toHaveText('Menu')
   await expect(page1.getByTestId('details-card-entity')).toHaveText('Playwright Test Menu update')
   await expect(page1.getByTestId('details-card-action')).toHaveText('UPDATED')
   await expect(page1.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify old field value and new field value comparison is correct
   await expect(page1.getByTestId('details-table')).toBeVisible()
   const detailsTableRow = page1.getByTestId('details-table-body-row-Name')
   await expect(detailsTableRow.getByTestId('details-table-body-Name_name')).toHaveText('Name')
   await expect(detailsTableRow.getByTestId('details-table-body-Name_old')).toHaveText(
     'Playwright Test Menu'
   )
   await expect(detailsTableRow.getByTestId('details-table-body-Name_new')).toHaveText(
     'Playwright Test Menu update'
   )


   // go to the menu page again
   const page2Promise = page1.waitForEvent('popup')
   await page1.getByTestId('details-card-config-url').click()
   const page2 = await page2Promise


   //archive this menu, save and publish the changes, and go back to publish history page


   await page2.getByRole('button', { name: 'more_horiz' }).click()


   page2.on('dialog', async (dialog) => {
     await dialog.accept()
   })
   await page2.getByRole('link', { name: 'archive Archive' }).click()


   await page2.getByRole('link', { name: 'Save' }).click()
   await page2.getByRole('link', { name: 'Save' }).click()
   await page2.getByRole('link', { name: 'Publish Now' }).click()


   await page2.getByTestId('publish-history-link').click()


   const publishedEntityRow2 = page2.getByTestId(
     `publish-history-changes-table-row-${entityType}_${entityId}`
   )
   const actionCol2 = publishedEntityRow2.locator('td:nth-child(1)')


   //use a loop function to keep refreshing the page until the latest publish is showing up
   //Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries1 = 10 // 10 * 5 seconds = 50 seconds max retry time
   let retries1 = 0


   while (retries1 < maxRetries1) {
     // Check if the element has the expected text
     try {
       // click on first row of publish history page
       await page2.locator('#publish-history-table-row-0').click()
       // verify action "DELETED"
       await expect(actionCol2).toHaveText('DELETED', { timeout: 5000 }) // Wait for the text
       console.log('Text found: "DELETED"')
       break // Exit the loop once the condition is met
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page2.reload() // Reload the page
       await page2.waitForTimeout(5000) // Wait for 5 seconds before the next check
       retries1++ // Increment the retry count
     }
   }


   // verify entity type
   const entityTypeCol2 = publishedEntityRow2.locator('td:nth-child(2)')
   await expect(entityTypeCol2).toHaveText('Menu')
   // verify entity name
   const entityCol2 = publishedEntityRow2.locator('td:nth-child(3)')
   await expect(entityCol2).toHaveText('Playwright Test Menu update')
   // drill into details page
   await publishedEntityRow2.click()


   // verify the top section of details card
   await expect(page2.getByTestId('details-card-entity-type')).toHaveText('Menu')
   await expect(page2.getByTestId('details-card-entity')).toHaveText('Playwright Test Menu update')
   await expect(page2.getByTestId('details-card-action')).toHaveText('DELETED')
   await expect(page2.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify old field value and new field value are correct
   await expect(page2.getByTestId('details-table')).toBeVisible()
   const detailsTableRow1 = page2.getByTestId('details-table-body-row-Name')
   await expect(detailsTableRow1.getByTestId('details-table-body-Name_name')).toHaveText('Name')
   await expect(detailsTableRow1.getByTestId('details-table-body-Name_old')).toHaveText(
     'Playwright Test Menu update'
   )
   await expect(detailsTableRow1.getByTestId('details-table-body-Name_new')).toHaveText('N/A')
 })
})


const createMenuRequestBody = () => {
 return [
   {
     name: 'Playwright Test Menu',
     ordinal: null,
     menuGroupMasterIds: ['300000001556386110', '300000001556386111'],
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