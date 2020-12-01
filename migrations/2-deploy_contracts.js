const ContractWithFlashLoan = artifacts.require("ContractWithFlashLoan.sol");
const { mainnet: addresses } = require('../addresses');

module.exports = async function(deployer, network, [beneficiaryAddress, _]) {
    deployer.deploy(
      ContractWithFlashLoan,
      addresses.onesplit.onesplit,
      addresses.tokens.eth,
      addresses.tokens.dai,
      beneficiaryAddress
    );
  };
