const onesplitMainnet = require('./onesplit-mainnet.json')
const tokensMainnet = require('./tokens-mainnet.json');
const aaveMainnet = require('./aave-mainnet.json');

module.exports = {
  mainnet: {
    onesplit: onesplitMainnet,
    tokens: tokensMainnet,
    aave: aaveMainnet
  }
};