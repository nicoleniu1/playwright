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


   //create a new menu group and a new menu item in this new menu
   await page1.getByRole('button', { name: 'add  Add' }).click()
   await page1
     .locator('input[name="menu\\.groups\\[0\\]\\.name"]')
     .fill('playwright test menu group')
   await page1.getByRole('link', { name: 'Save' }).click()


   await page1.getByRole('link', { name: 'playwright test menu group' }).click()


   await page1.getByRole('button', { name: 'add  Add' }).first().click()
   await page1
     .getByRole('row', { name: '$' })
     .getByPlaceholder('Name')
     .fill('playwright test menu item')
   await page1.getByRole('textbox', { name: '0.00' }).click()
   await page1.getByRole('textbox', { name: '0.00' }).fill('10')
   await page1.getByRole('link', { name: 'Save' }).click()


   //get the menu item guid
   await page1.getByRole('link', { name: 'playwright test menu item' }).click()
   const menuitemguid = await page1.locator('.other-versions-list-container').first().textContent()


   await page1.getByRole('link', { name: 'Save' }).click()
   await page1.getByRole('link', { name: 'Publish Now' }).click()


   await page1.getByTestId('publish-history-link').click()


   const publishedEntityRow1 = page1.getByTestId(
     `publish-history-changes-table-row-MenuItem_${menuitemguid}`
   )
   const actionCol = publishedEntityRow1.locator('td:nth-child(1)')


   //use the loop function to keep refreshing the page until the latest publish is showing up
   // Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries = 10 // 10 * 8 seconds = 80 seconds max retry time
   let retries = 0


   while (retries < maxRetries) {
     // Check if the element has the expected text
     try {
       //choose the create LSP log entry
       //click on first row of publish history page
       await page1.locator('#publish-history-table-row-0').click()
       // verify action "CREATED"
       await expect(actionCol).toHaveText('CREATED', { timeout: 5000 }) // Wait for the text
       console.log('Text found: "CREATED"')
       break // Exit the loop once the condition is met
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page1.reload() // Reload the page
       await page1.waitForTimeout(8000) // Wait for 8 seconds before the next check
       retries++ // Increment the retry count
     }
   }


   // verify entity type "Menu Item"
   const entityTypeCol = publishedEntityRow1.locator('td:nth-child(2)')
   await expect(entityTypeCol).toHaveText('Menu Item')
   // verify entity name is updated correctly
   const entityCol = publishedEntityRow1.locator('td:nth-child(3)')
   await expect(entityCol).toHaveText('playwright test menu item')


   // drill into details page
   await publishedEntityRow1.click()
   // verify the top section of details card
   await expect(page1.getByTestId('details-card-entity-type')).toHaveText('Menu Item')
   await expect(page1.getByTestId('details-card-entity')).toHaveText('playwright test menu item')
   await expect(page1.getByTestId('details-card-action')).toHaveText('CREATED')
   await expect(page1.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify the base price of this menu item is correct
   await expect(page1.getByTestId('details-table')).toBeVisible()
   const detailsTableRow = page1.getByTestId('details-table-body-row-Base Price')
   await expect(detailsTableRow.getByTestId('details-table-body-Base Price_name')).toHaveText(
     'Base Price'
   )
   await expect(detailsTableRow.getByTestId('details-table-body-Base Price_new')).toHaveText(
     '$10.00'
   )


   // go to menu item page again and update the menu item price strategy to LSP with a different price
   const page2Promise = page1.waitForEvent('popup')
   await page1.getByTestId('details-card-config-url').click()
   const page2 = await page2Promise


   await page2.getByText('Location Specific Price').click()
   await page2.getByRole('textbox', { name: '0.00' }).click()
   await page2.getByRole('textbox', { name: '0.00' }).fill('11')
   await page2.getByRole('link', { name: 'Save' }).click()
   await page2.getByRole('link', { name: 'Publish Now' }).click()
   await page2.getByTestId('publish-history-link').click()


   // Wait for 30 seconds before refreshing the page
   await page2.waitForTimeout(30000)


   // Refresh the page to load the latest publishes
   await page2.reload()


   //apply filter -- "Prices" to filter out LSP
   await page2.getByTestId('publish-history-filter-entity-types-selector-button').click()
   await page2.getByTestId('publish-history-filter-entity-types-selector-search').fill('Prices')
   await page2.getByTestId('selectMultipleListOptionsContainer-option-0').click()


   // Hide the overlay by modifying its CSS
   await page2
     .locator('[data-testid="overlay-select-panel"]')
     .evaluate((el) => (el.style.display = 'none'))


   await page2.getByTestId('publish-history-filter-entity-types-selector-button').click()


   await page2.locator('#publish-history-table-row-0').click()


   //choose the create LSP log entry
   const publishedEntityRow2 = await page2
     .locator('.border-default.border-b.md\\:hover\\:bg-gray-25.md\\:bg-gray-0.cursor-pointer')
     .first()
   const actionCol2 = publishedEntityRow2.locator('td:nth-child(1)')


   // verify action "CREATED"
   await expect(actionCol2).toHaveText('CREATED')
   // verify entity type "Location Specific Price"
   const entityTypeCol2 = publishedEntityRow2.locator('td:nth-child(2)')
   await expect(entityTypeCol2).toHaveText('Location Specific Price')
   // verify entity name "playwright test menu item - Mama Speenah's"
   const entityCol2 = publishedEntityRow2.locator('td:nth-child(3)')
   await expect(entityCol2).toHaveText("playwright test menu item - Mama Speenah's")
   // drill into details page
   await publishedEntityRow2.click()


   // verify the top section of details card
   await expect(page2.getByTestId('details-card-entity-type')).toHaveText(
     'Location Specific Price'
   )
   await expect(page2.getByTestId('details-card-entity')).toHaveText(
     "playwright test menu item - Mama Speenah's"
   )
   await expect(page2.getByTestId('details-card-action')).toHaveText('CREATED')
   await expect(page2.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify the LSP price is correct
   await expect(page2.getByTestId('details-table')).toBeVisible()
   const detailsTableRow1 = page2.getByTestId('details-table-body-row-Base Price')
   await expect(detailsTableRow1.getByTestId('details-table-body-Base Price_name')).toHaveText(
     'Base Price'
   )
   await expect(detailsTableRow1.getByTestId('details-table-body-Base Price_new')).toHaveText(
     '11.0'
   )


   //Update LSP
   //go back to the menu item page
   await page2
     .getByTestId('focus-view-body')
     .getByTestId(`publish-history-changes-table-row-MenuItem_${menuitemguid}`)
     .click()
   const page3Promise = page2.waitForEvent('popup')
   await page2.getByTestId('details-card-config-url').click()
   const page3 = await page3Promise


   //update the LSP price of this menu item, save and publish the changes, and go back to publish history page
   await page3.getByRole('textbox', { name: '0.00' }).fill('12.00')
   await page3.getByRole('link', { name: 'Save' }).click()
   await page3.getByRole('link', { name: 'Publish Now' }).click()


   await page3.getByTestId('publish-history-link').click()


   const publishedEntityRow3 = await page3
     .locator('.border-default.border-b.md\\:hover\\:bg-gray-25.md\\:bg-gray-0.cursor-pointer')
     .first()
   const actionCol3 = publishedEntityRow3.locator('td:nth-child(1)')


   //use the loop function to keep refreshing the page until the latest publish is showing up
   // Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries1 = 10 // 10 * 8 seconds = 80 seconds max retry time
   let retries1 = 0


   while (retries1 < maxRetries1) {
     // Check if the element has the expected text
     try {
       //choose the create LSP log entry
       await page3.locator('#publish-history-table-row-0').click()
       // verify action "UPDATED"
       await expect(actionCol3).toHaveText('UPDATED', { timeout: 5000 }) // Wait for the text
       console.log('Text found: "UPDATED"')
       break // Exit the loop once the condition is met
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page3.reload() // Reload the page
       await page3.waitForTimeout(8000) // Wait for 5 seconds before the next check
       retries1++ // Increment the retry count
     }
   }


   // verify entity type "Location Specific Price"
   const entityTypeCol3 = publishedEntityRow3.locator('td:nth-child(2)')
   await expect(entityTypeCol3).toHaveText('Location Specific Price')
   // verify entity name "playwright test menu item - Mama Speenah's"
   const entityCol3 = publishedEntityRow3.locator('td:nth-child(3)')
   await expect(entityCol3).toHaveText("playwright test menu item - Mama Speenah's")
   // drill into details page
   await publishedEntityRow3.click()


   // verify the top section of details card
   await expect(page3.getByTestId('details-card-entity-type')).toHaveText(
     'Location Specific Price'
   )
   await expect(page3.getByTestId('details-card-entity')).toHaveText(
     "playwright test menu item - Mama Speenah's"
   )
   await expect(page3.getByTestId('details-card-action')).toHaveText('UPDATED')
   await expect(page3.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify the LSP price is correct
   await expect(page3.getByTestId('details-table')).toBeVisible()
   const detailsTableRow2 = page3.getByTestId('details-table-body-row-Base Price')
   await expect(detailsTableRow2.getByTestId('details-table-body-Base Price_name')).toHaveText(
     'Base Price'
   )
   await expect(detailsTableRow2.getByTestId('details-table-body-Base Price_old')).toHaveText(
     '11.0'
   )
   await expect(detailsTableRow2.getByTestId('details-table-body-Base Price_new')).toHaveText(
     '12.0'
   )


   //Delete LSP
   //go back to the menu item page
   await page3
     .getByTestId('focus-view-body')
     .getByTestId(`publish-history-changes-table-row-MenuItem_${menuitemguid}`)
     .click()
   const page4Promise = page3.waitForEvent('popup')
   await page3.getByTestId('details-card-config-url').click()
   const page4 = await page4Promise


   //Update the price strategy of this menu item to "Base price", save and publish the changes, and go back to publish history page
   await page4.locator('li').filter({ hasText: 'Base Price' }).locator('label').click()
   await page4.getByRole('link', { name: 'Save' }).click()
   await page4.getByRole('link', { name: 'Publish Now' }).click()


   await page4.getByTestId('publish-history-link').click()


   const publishedEntityRow4 = await page4
     .locator('.border-default.border-b.md\\:hover\\:bg-gray-25.md\\:bg-gray-0.cursor-pointer')
     .first()
   const actionCol4 = publishedEntityRow4.locator('td:nth-child(1)')
   const entityTypeCol4 = publishedEntityRow4.locator('td:nth-child(2)')


   //use the loop function to keep refreshing the page until the latest publish is showing up
   //Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries2 = 10 // 10 * 8 seconds = 80 seconds max retry time
   let retries2 = 0


   while (retries2 < maxRetries2) {
     // Check if the element has the expected text
     try {
       //choose the create LSP log entry
       await page4.locator('#publish-history-table-row-0').click()
       // verify entity type "Menu Item"
       await expect(entityTypeCol4).toHaveText('Menu Item', { timeout: 5000 }) // Wait for the text
       console.log('Text found: "UPDATED"')
       break // Exit the loop once the condition is met
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page4.reload() // Reload the page
       await page4.waitForTimeout(8000) // Wait for 5 seconds before the next check
       retries2++ // Increment the retry count
     }
   }


   // verify action "DELETED"
   await expect(actionCol4).toHaveText('UPDATED')
   // verify entity name "playwright test menu item"
   const entityCol4 = publishedEntityRow4.locator('td:nth-child(3)')
   await expect(entityCol4).toHaveText('playwright test menu item')
   // drill into details page
   await publishedEntityRow4.click()


   // verify the top section of details card
   await expect(page4.getByTestId('details-card-entity-type')).toHaveText('Menu Item')
   await expect(page4.getByTestId('details-card-entity')).toHaveText('playwright test menu item')
   await expect(page4.getByTestId('details-card-action')).toHaveText('UPDATED')
   await expect(page4.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify the price strategy is updated from LSP to default price
   await expect(page4.getByTestId('details-table')).toBeVisible()
   const detailsTableRow3 = page4.getByTestId('details-table-body-row-Price Group')
   await expect(detailsTableRow3.getByTestId('details-table-body-Price Group_name')).toHaveText(
     'Price Group'
   )
   await expect(detailsTableRow3.getByTestId('details-table-body-Price Group_old')).toHaveText(
     "playwright test menu item - Mama Speenah's"
   )
   await expect(detailsTableRow3.getByTestId('details-table-body-Price Group_new')).toHaveText(
     'N/A'
   )
   const detailsTableRow4 = page4.getByTestId('details-table-body-row-Pricing')
   await expect(detailsTableRow4.getByTestId('details-table-body-Pricing_name')).toHaveText(
     'Pricing'
   )
   await expect(detailsTableRow4.getByTestId('details-table-body-Pricing_old')).toHaveText(
     'location specific price'
   )
   await expect(detailsTableRow4.getByTestId('details-table-body-Pricing_new')).toHaveText(
     'default'
   )
 })
})


const createMenuRequestBody = () => {
 return [
   {
     name: 'Playwright Test Menu',
     ordinal: null,
     menuGroupMasterIds: ['300000001556386112', '300000001556386113'],
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