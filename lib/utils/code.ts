export const getCode = () => (typeof window === "undefined" ? "" : localStorage.getItem("cv_code") || "");
export const setCode = (c: string) => localStorage.setItem("cv_code", c.trim().toUpperCase());
