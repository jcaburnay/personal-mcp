export function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

export function structuredToolResult<TData extends Record<string, unknown>>(
  text: string,
  data: TData
) {
  return {
    content: textContent(text),
    structuredContent: data,
  };
}
