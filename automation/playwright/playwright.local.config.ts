process.env.WMS_START_LOCAL_WEB = "true";

const { default: config } = await import("./playwright.config");

export default config;
