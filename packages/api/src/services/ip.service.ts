export const ipBlockCheck = (ip: string) => {
  return {
    ip,
    blocked: false,
    reason: null,
  };
};
