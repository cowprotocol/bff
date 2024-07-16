export async function throwIfUnsuccessful(
  errorMessage: string,
  response: Response
) {
  if (!response.ok) {
    const text = await response.text().catch(() => undefined);
    throw new Error(
      `${errorMessage}. ${response.status} (${response.statusText})${
        text ? ': ' + text : ''
      }. URL: ${response.url}`
    );
  }
}
