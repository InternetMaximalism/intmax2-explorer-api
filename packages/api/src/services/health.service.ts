import packageJson from "../../package.json";

export const healthCheck = () => {
  const params = {
    status: "OK",
    timestamp: new Date().toISOString(),
    application: {
      version: packageJson.version,
    },
  };
  return params;
};
