import axios from 'axios';
import { config } from 'dotenv';
import logger from './logger';

config({
  path: '.env',
});

const filecoinURL = process.env.FILECOIN_URL;
if (!filecoinURL) {
  throw new Error('FILECOIN_URL is not defined');
}
logger.info(`FILECOIN_URL: ${filecoinURL}`);

interface UserPenalty {
  minerID: string;
}

export async function fetchMinerPenalty(minerID: string): Promise<string> {
  try {
    const url = `${filecoinURL}/penalty?miner=${minerID}`;
    logger.info(`Fetching from ${url}`);
    const response = await axios.get<string>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error message:', error.message);
      console.error('HTTP status code:', error.response?.status);
      console.error('Response data:', error.response?.data);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
