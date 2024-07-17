export async function throwIfUnsuccessful(
  errorMessage: string,
  response: Response,
  context?: string
) {
  if (!response.ok) {
    const text = await response.text().catch(() => undefined);
    throw new Error(
      `${errorMessage}. ${response.status} (${response.statusText})${
        text ? ': ' + text : ''
      }. ${context ? context + ' ' : ''}URL: ${response.url}`
    );
  }
}
