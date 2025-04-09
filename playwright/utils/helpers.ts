import { expect, Page, APIRequestContext } from '@playwright/test'
import { CREATE_MENU_API, FULL_PUBLISH_API, LIST_PUBLISH_JOBS_API } from './constants'


export const adhocOverride = async (page: Page) => {
 // This function ensures that we are testing against an adhoc in Jenkins,
 // or the local build when running in UI mode locally.
 // This allows us to include any changes from the branch in testing.
 if ((process.env.CI && process.env.ADHOC_URL) || process.env.LOCAL) {
   const url = process.env.ADHOC_URL || 'https://dev.eng.toastteam.com:9990/bundle.js'
   await page.evaluate((url) => {
     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     window.importMapOverrides.addOverride('pub-hub-spa', url)
   }, url)
   page.reload()
 }
}


// Triggers full publish job at restaurant matching headers, verifies completion and returns corresponding publish job
// using query param 'since' as current timestamp so that we get the publish job in the first page
export const doFullPublishAndGetPublishJob = async (
 context: APIRequestContext,
 headers: any,
 publishReqBody: any
) => {
 const since = new Date(Date.now() - 30000).toISOString()
 const newPublishRespJson = await doFullPublish(context, headers, publishReqBody)
 const newPublishOriginId = newPublishRespJson.originId
 let publishJobId = null
 // wait until the triggered publish job is found
 await expect
   .poll(
     async () => {
       const publishJobsResp = await context.get(
         LIST_PUBLISH_JOBS_API + `?since=${since}`,
         headers
       )
       await expect(publishJobsResp).toBeOK()
       const publishJobsRespJson = await publishJobsResp.json()
       for (const publishJob of publishJobsRespJson.data) {
         if (publishJob.originId === newPublishOriginId) {
           publishJobId = publishJob.id
           return publishJob.originId
         }
       }
     },
     {
       intervals: [5_000],
       timeout: 200_000
     }
   )
   .toEqual(newPublishOriginId)
 return publishJobId!
}


export const doFullPublish = async (
 context: APIRequestContext,
 headers: any,
 publishReqBody: any
) => {
 const newPublishResp = await context.post(FULL_PUBLISH_API, {
   ...headers,
   data: {
     ...publishReqBody
   }
 })
 await expect(newPublishResp).toBeOK()
 const newPublishRespJson = await newPublishResp.json()
 return newPublishRespJson
}


export const createMenuConfig = async (
 context: APIRequestContext,
 headers: any,
 requestBody: any
) => {
 const menuConfigResp = await context.post(CREATE_MENU_API, {
   ...headers,
   data: [...requestBody]
 })
 await expect(menuConfigResp).toBeOK()
 const menuConfigRespJson = await menuConfigResp.json()
 return menuConfigRespJson[0]
}


export const getCurrentDateString = async () => {
 const currentDate = new Date()
 const day = currentDate.getDate()
 const month = currentDate.getMonth() + 1
 const year = currentDate.getFullYear() % 100
 const formattedDate = `${month}/${day}/${year}`
 return formattedDate
}
