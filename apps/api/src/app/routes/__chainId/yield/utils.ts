export function trimDoubleQuotes(value: string): string {
  if (value[0] === '"') {
    return trimDoubleQuotes(value.slice(1))
  }

  if (value[value.length - 1] === '"') {
    return trimDoubleQuotes(value.slice(0, -1))
  }

  return value
}