const ContractWithFlashLoan = artifacts.require("ContractWithFlashLoan.sol");
const { mainnet: addresses } = require('../addresses');

module.exports = function (deployer, _network, [beneficiaryAddress, _]) {
  deployer.deploy(
      ContractWithFlashLoan,
      addresses.onesplit.onesplit,
      addresses.tokens.dai,
      beneficiaryAddress
  );
};