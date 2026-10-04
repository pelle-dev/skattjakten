export const normalizeCodeClient = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
