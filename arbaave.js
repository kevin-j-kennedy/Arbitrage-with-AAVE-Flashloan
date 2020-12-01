require("dotenv").config()
const Web3 = require('web3');
const { mainnet: addresses } = require('./addresses');
const ContractWithFlashLoanArtifact = require('./build/contracts/ContractWithFlashLoan.json');
const oneSplitABI = require('./abis/onesplit.json');
const oneSplitAddress = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E";

const web3 = new Web3(
  new Web3.providers.WebsocketProvider('ws://127.0.0.1:8545')
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const onesplitContract = new web3.eth.Contract(
    oneSplitABI,
    oneSplitAddress,
    );

const txCost = '100'
const AMOUNT_DAI_WEI = web3.utils.toBN(web3.utils.toWei('40000', 'ether'));
const AMOUNT_DAI = web3.utils.fromWei(AMOUNT_DAI_WEI);

const init = async () => {

const networkId = await web3.eth.net.getId();

const contractWithFlashLoanAddress =
  ContractWithFlashLoanArtifact.networks[networkId].address;

const flashloan = new web3.eth.Contract(
  ContractWithFlashLoanArtifact.abi,
  contractWithFlashLoanAddress,
  );

  web3.eth.subscribe('newBlockHeaders')
    .on('data', async block => {
      console.log(`New block received. Block # ${block.number}`);

      const amountsEthresults = await onesplitContract
        .methods
        .getExpectedReturn(
           addresses.tokens.dai, 
           '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
           AMOUNT_DAI_WEI,
           100,
           0
          )
          .call();
      amountsEth = amountsEthresults.returnAmount; 

      const ethFromOnesplit = web3.utils.fromWei(amountsEth.toString());
      const ethPricetoBuy = AMOUNT_DAI / ethFromOnesplit;

      const amountsDairesults = await onesplitContract
        .methods
        .getExpectedReturn(
           '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
           addresses.tokens.dai, 
           amountsEth,
           100,
           0
          )
          .call();
      amountsDai = amountsDairesults.returnAmount;

      const daiFromOnesplit = web3.utils.fromWei(amountsDai.toString());
      const ethPriceToSell = daiFromOnesplit / ethFromOnesplit;

      console.log(`Total number of ETH received from purchase: ${ethFromOnesplit}`);
      console.log(`Total number of DAI received from sale of ETH: ${daiFromOnesplit}`);
      console.log(`Price to Buy: ${ethPricetoBuy}`);
      console.log(`Price to Sell: ${ethPriceToSell}`);
      
        {
              
        const profit = daiFromOnesplit - AMOUNT_DAI - txCost;
        console.log(`Profit in Dai: ${profit}`);
        console.log();

        if(profit > 100) {
          console.log('Arb opportunity found DAI -> ETH!');
          console.log(`Expected profit: ${profit} Dai`);
        const params = 0;
        const tx = flashloan.methods.initateFlashLoan(
          contractWithFlashLoanAddress, 
          addresses.tokens.dai, 
          AMOUNT_DAI_WEI,
          params
        );
        const gasprice = await web3.eth.getGasPrice();
        const gasPrice = Math.round(gasprice * 1.3);
        const gasLimit = 4000000;
        const data = tx.encodeABI();
        const txData = {
          from: admin,
          to: flashloan.options.address,
          data,
          gasPrice,
          gasLimit
          };
          
          const receipt = await web3.eth.sendTransaction(txData);
          console.log(`Transaction hash: ${receipt.transactionHash}`);
          };
        }
      })
    .on('error', error => {
      console.log(error);
    });
}
init();
