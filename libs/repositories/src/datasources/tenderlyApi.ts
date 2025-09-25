export const TENDERLY_API_KEY = process.env.TENDERLY_API_KEY as string;

export const TENDERLY_ORG_NAME = process.env.TENDERLY_ORG_NAME;
export const TENDERLY_PROJECT_NAME = process.env.TENDERLY_PROJECT_NAME;

export const TENDERLY_API_BASE_ENDPOINT = `https://api.tenderly.co/api/v1/account/${TENDERLY_ORG_NAME}/project/${TENDERLY_PROJECT_NAME}`;

export const getTenderlySimulationLink = (simulationId: string): string => {
  // This link only work for public projects, if the project is private remove the "/public" from the link
  return `https://dashboard.tenderly.co/public/${TENDERLY_ORG_NAME}/${TENDERLY_PROJECT_NAME}/simulator/${simulationId}`;
};
