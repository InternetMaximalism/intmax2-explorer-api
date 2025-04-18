import { version } from "../../../../package.json";

export const healthCheck = () => {
  const params = {
    status: "OK",
    timestamp: new Date().toISOString(),
    application: {
      version,
    },
  };
  return params;
};
