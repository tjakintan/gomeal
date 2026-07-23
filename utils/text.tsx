export const capitalize = (text?: string) =>
  text
    ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    : "";
    
export const limitLength = (text: string, maxLength: number) =>
  text.length > maxLength ? text.slice(0, maxLength) : text;

export const isWebsite = (url: string) => {
  if (!url.trim()) return true; // empty is allowed, website is optional
  // allow with or without protocol, require at least one dot
  const pattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
  return pattern.test(url.trim());
};