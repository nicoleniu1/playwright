import { test, expect } from '@playwright/test'
import { adhocOverride } from '../../utils/helpers'
import { PACKAGING_CONFIG_URL, PUBLISH_CONFIG_URL } from '../../utils/constants'


test.describe('publish history test suite 1', () => {
 test.use({ storageState: 'playwright/.auth/user1.json' })
 test('publish menu and verify the changes in publish history', async ({ page }) => {
   // 10 min timeout for the whole test - overkill but useful if publishing is slow
   test.setTimeout(600000)


   await adhocOverride(page)


   await page.goto(PACKAGING_CONFIG_URL)


   //close the set up checklist window if it's visible
   const closeButton = page.locator('[data-testid="header-close-button"]')


   // Wait for the button to be visible with a timeout
   await closeButton.waitFor({ state: 'visible', timeout: 25000 })


   // If the element is visible, perform the click
   if (await closeButton.isVisible()) {
     await closeButton.click()
   }


   //Create and update new PackagingConfiguration
   //Enable packaging preferences
   await page.getByTestId('labelled-toggle-switch-5-input').check()


   //add guest message
   await page.getByTestId('textarea-7').click()
   await page.getByTestId('textarea-7').fill('Help us reduce plastic waste!')


   //add packaging items
   await page.locator('button[data-testid="buttons-11"]').click()
   await page.locator('//input[@value="UTENSILS"]').check()
   await page.locator('#guestName').click()
   await page.locator('#guestName').fill('Utensils')
   await page.locator('button[type="submit"]').click()


   //hide guest packaging selections on toast devces
   await page.getByText('HideHide packaging selections').click()


   await page.locator('button[data-testid="buttons-1"]').click()
   await page.getByTestId('global-save-alert-modal-save-btn').click()
   await page.getByRole('link', { name: 'Go to Publish Center' }).click()
   await page.goto(PUBLISH_CONFIG_URL)
   await page.getByRole('button', { name: 'Publish Selected Restaurants' }).click()
   await page.getByTestId('publish-history-link').click()


   const publishedEntityRow = await page
     .locator('.border-default.border-b.md\\:hover\\:bg-gray-25.md\\:bg-gray-0.cursor-pointer')
     .first()
   const actionCol = publishedEntityRow.locator('td:nth-child(1)')
   const entityTypeCol = publishedEntityRow.locator('td:nth-child(2)')


   //Use the loop function to keep refreshing the page until the latest publish is showing up
   //Define a timeout for the loop (e.g., maximum 30 seconds of retries)
   const maxRetries = 10 // 10 * 8 seconds = 80 seconds max retry time
   let retries = 0


   while (retries < maxRetries) {
     try {
       // Click on the first row of the publish history page
       await page.locator('#publish-history-table-row-0').click()


       // Verify action column text ("CREATED" or "UPDATED")
       await expect(actionCol).toHaveText(/CREATED|UPDATED/, { timeout: 5000 }) // Wait for either "CREATED" or "UPDATED"
       console.log(`Text found: "${await actionCol.textContent()}"`)


       // If the action is "CREATED", only verify the entity type
       if ((await actionCol.textContent()) === 'CREATED') {
         // Verify entity type
         await expect(entityTypeCol).toHaveText('Packaging')
         break // Exit the loop once the action is "CREATED" and the entity type is verified
       }


       // If the action is "UPDATED", verify entity type and drill into details page
       if ((await actionCol.textContent()) === 'UPDATED') {
         // Verify entity type
         await expect(entityTypeCol).toHaveText('Packaging')


         // Drill into details page
         await publishedEntityRow.click()
         break // Exit the loop after drilling into the details page
       }
     } catch (error) {
       // If the text is not found, refresh the page after waiting 5 seconds
       console.log('Text not found, reloading page...')
       await page.reload() // Reload the page
       await page.waitForTimeout(8000) // Wait for 8 seconds before the next check
       retries++ // Increment the retry count
     }
   }


   await page
     .locator('[data-testid="details-card-entity-type"]')
     .waitFor({ state: 'visible', timeout: 25000 })


   // verify the top section of details card
   await expect(page.getByTestId('details-card-entity-type')).toHaveText('Packaging')
   await expect(page.getByTestId('details-card-entity')).toHaveText('Packaging')
   await expect(page.getByTestId('details-card-action')).toHaveText('UPDATED')
   await expect(page.getByTestId('details-info-last-edit-by-name')).toHaveText('User1 Test')


   // verify the updated changes in details card
   await expect(page.getByTestId('details-table')).toBeVisible()
   const detailsTableRow = page.getByTestId('details-table-body-row-Enabled')
   await expect(detailsTableRow.getByTestId('details-table-body-Enabled_name')).toHaveText(
     'Enabled'
   )
   await expect(detailsTableRow.getByTestId('details-table-body-Enabled_old')).toHaveText('no')
   await expect(detailsTableRow.getByTestId('details-table-body-Enabled_new')).toHaveText('yes')


   const detailsTableRow1 = page.getByTestId('details-table-body-row-Guest Message')
   await expect(detailsTableRow1.getByTestId('details-table-body-Guest Message_name')).toHaveText(
     'Guest Message'
   )
   await expect(detailsTableRow1.getByTestId('details-table-body-Guest Message_old')).toHaveText(
     'N/A'
   )
   await expect(detailsTableRow1.getByTestId('details-table-body-Guest Message_new')).toHaveText(
     'Help us reduce plastic waste!'
   )


   const detailsTableRow2 = page.getByTestId('details-table-body-row-Pos Show Defaults')
   await expect(
     detailsTableRow2.getByTestId('details-table-body-Pos Show Defaults_name')
   ).toHaveText('Pos Show Defaults')
   await expect(
     detailsTableRow2.getByTestId('details-table-body-Pos Show Defaults_old')
   ).toHaveText('yes')
   await expect(
     detailsTableRow2.getByTestId('details-table-body-Pos Show Defaults_new')
   ).toHaveText('no')


   //Update existing PackagingConfiguration
   await page.goto(PACKAGING_CONFIG_URL)


   //disable packaging preferences
   await page.getByTestId('labelled-toggle-switch-5-input').uncheck()


   //clear guest message
   await page.getByTestId('textarea-7').click()
   await page.getByTestId('textarea-7').fill('')


   //delete packaging items
   //await page.getByRole('button', { name: 'Edit item' }).click();
   await page.getByRole('row', { name: 'Utensils No Edit item' }).getByRole('button').click()
   await page.getByTestId('buttons-33').click()


   //show guest packaging selections on toast devces
   await page.getByText('ShowAlways show guest').click()


   await page.locator('button[data-testid="buttons-1"]').click()
   await page.getByTestId('global-save-alert-modal-save-btn').click()
   await page.getByRole('link', { name: 'Go to Publish Center' }).click()
   await page.goto(PUBLISH_CONFIG_URL)
   await page.getByRole('button', { name: 'Publish Selected Restaurants' }).click()
   await page.getByTestId('publish-history-link').click()


   // Wait for 30 seconds before refreshing the page
   await page.waitForTimeout(30000)


   // Refresh the page to load the latest publishes
   await page.reload()


   await page.locator('#publish-history-table-row-0').click()
   // Verify entity type
   await expect(actionCol).toHaveText('UPDATED')


   await expect(entityTypeCol).toHaveText('Packaging')


   // Drill into details page
   await publishedEntityRow.click()


   await page
     .locator('[data-testid="details-card-entity-type"]')
     .waitFor({ state: 'visible', timeout: 15000 })


   // verify the updated changes in details card
   await expect(page.getByTestId('details-table')).toBeVisible()
   await expect(detailsTableRow.getByTestId('details-table-body-Enabled_name')).toHaveText(
     'Enabled'
   )
   await expect(detailsTableRow.getByTestId('details-table-body-Enabled_old')).toHaveText('yes')
   await expect(detailsTableRow.getByTestId('details-table-body-Enabled_new')).toHaveText('no')


   await expect(detailsTableRow1.getByTestId('details-table-body-Guest Message_name')).toHaveText(
     'Guest Message'
   )
   await expect(detailsTableRow1.getByTestId('details-table-body-Guest Message_old')).toHaveText(
     'Help us reduce plastic waste!'
   )
   await expect(detailsTableRow1.getByTestId('details-table-body-Guest Message_new')).toHaveText(
     'N/A'
   )


   const detailsTableRow3 = page.getByTestId('details-table-body-row-Items')
   await expect(detailsTableRow3.getByTestId('details-table-body-Items_name')).toHaveText('Items')
   await expect(detailsTableRow3.getByTestId('details-table-body-Items_old')).toHaveText('Items')
   await expect(detailsTableRow3.getByTestId('details-table-body-Items_new')).toHaveText('N/A')


   await expect(
     detailsTableRow2.getByTestId('details-table-body-Pos Show Defaults_name')
   ).toHaveText('Pos Show Defaults')
   await expect(
     detailsTableRow2.getByTestId('details-table-body-Pos Show Defaults_old')
   ).toHaveText('no')
   await expect(
     detailsTableRow2.getByTestId('details-table-body-Pos Show Defaults_new')
   ).toHaveText('yes')
 })
})