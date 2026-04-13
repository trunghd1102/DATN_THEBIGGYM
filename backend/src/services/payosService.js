const { PayOS } = require("@payos/node");
const env = require("../config/env");

let payosClient = null;

function isPayOSConfigured() {
  return Boolean(env.payos.clientId && env.payos.apiKey && env.payos.checksumKey);
}

function getPayOSClient() {
  if (!isPayOSConfigured()) {
    const error = new Error("PayOS chưa được cấu hình trên server");
    error.statusCode = 500;
    throw error;
  }

  if (!payosClient) {
    payosClient = new PayOS({
      clientId: env.payos.clientId,
      apiKey: env.payos.apiKey,
      checksumKey: env.payos.checksumKey
    });
  }

  return payosClient;
}

module.exports = {
  isPayOSConfigured,
  getPayOSClient
};
