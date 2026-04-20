import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const optimizePortfolio = async (expectedReturns, covMatrix, assetNames) => {
  try {
    const response = await axios.post(`${API_URL}/optimize`, {
      expected_returns: expectedReturns,
      cov_matrix: covMatrix,
      asset_names: assetNames
    });
    return response.data;
  } catch (error) {
    console.error('Optimization error:', error);
    throw error;
  }
};