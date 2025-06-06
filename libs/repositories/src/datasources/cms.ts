import { CmsClient } from '@cowprotocol/cms';

export type CmsClient = ReturnType<typeof CmsClient>;

let cmsClient: CmsClient | undefined = undefined;

export const isCmsEnabled =
  process.env.CMS_ENABLED !== undefined
    ? process.env.CMS_ENABLED.toLowerCase() === 'true'
    : !!process.env.CMS_API_KEY;

export function getCmsClient(): CmsClient {
  if (cmsClient) {
    return cmsClient;
  }

  const cmsBaseUrl = process.env.CMS_BASE_URL;

  const cmsApiKey = process.env.CMS_API_KEY;
  if (!cmsApiKey) {
    throw new Error('CMS_API_KEY is not set');
  }

  if (!isCmsEnabled) {
    throw new Error('CMS is not enabled');
  }

  cmsClient = CmsClient({
    url: cmsBaseUrl,
    apiKey: cmsApiKey,
  });

  return cmsClient;
}
