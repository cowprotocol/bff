import { CmsClient } from '@cowprotocol/cms';

export type CmsClient = ReturnType<typeof CmsClient>;

let cmsClient: CmsClient | undefined = undefined;

export function getCmsClient(): CmsClient {
  if (cmsClient) {
    return cmsClient;
  }

  const cmsBaseUrl = process.env.CMS_BASE_URL;

  const cmsApiKey = process.env.CMS_API_KEY;
  if (!cmsApiKey) {
    throw new Error('CMS_API_KEY is not set');
  }

  cmsClient = CmsClient({
    url: cmsBaseUrl,
    apiKey: cmsApiKey,
  });

  return cmsClient;
}
