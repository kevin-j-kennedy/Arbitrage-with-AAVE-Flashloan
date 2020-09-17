require("dotenv").config()
const Web3 = require('web3');
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
const ContractWithFlashLoan = require('./build/contracts/ContractWithFlashLoan.json');
const oneSplit = require('./build/contracts/IOneSplit.json');
const oneSplitAddress = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E";
const daiaddress = "0x6b175474e89094c44da98b954eedeac495271d0f";

const web3 = new Web3(
  new Web3.providers.WebsocketProvider('ws://127.0.0.1:8546')
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const onesplitContract = new web3.eth.Contract(oneSplit.abi, oneSplitAddress);
const ONE_WEI = web3.utils.toBN('1');
const AMOUNT_DAI = web3.utils.toBN('100000');
const AMOUNT_DAI_WEI = web3.utils.toBN(web3.utils.toWei('100000', 'ether'));
const txCost = '150'

const init = async () => {
  const networkId = await web3.eth.net.getId();
  const flashloan = new web3.eth.Contract(ContractWithFlashLoan.abi, ContractWithFlashLoan.networks[networkId].address);
  
  let ethPrice;
  const updateEthPrice = async () => {
    const results = await onesplitContract
      .methods
      .getExpectedReturn(
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
        addresses.tokens.dai, 
        1,
        10,
        0
      )
      .call();
      ethPrice = (web3.utils.toBN('1') * (web3.utils.toBN(results.returnAmount))) / ONE_WEI; 
  }
  await updateEthPrice();
  setInterval(updateEthPrice, 15000);

  web3.eth.subscribe('newBlockHeaders')
    .on('data', async block => {
      console.log(`New block received. Block # ${block.number}`);

  let amountsEth;
  const updateamountsEth = async () => {  
    const amountsEthresults = await onesplitContract
      .methods
      .getExpectedReturn(
         addresses.tokens.dai, 
         '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
         AMOUNT_DAI,
         10,
         0
        )
        .call();
     amountsEth = amountsEthresults.returnAmount; 
  }
  await updateamountsEth();
  setInterval(updateamountsEth, 15000);

      const ethFromOnesplit = web3.utils.toBN(amountsEth) / ONE_WEI;
      const ethPricetoBuy = web3.utils.toBN(AMOUNT_DAI) / web3.utils.toBN(amountsEth);

      let amountsDai;
      const updateamountsDai = async () => {  
        const amountsDairesults = await onesplitContract
          .methods
          .getExpectedReturn(
             '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
             addresses.tokens.dai, 
             ethFromOnesplit,
             10,
             0
            )
            .call();
         amountsDai = amountsDairesults.returnAmount;

  }
      await updateamountsDai();
      setInterval(updateamountsDai, 15000);

      const ethPriceToSell = (web3.utils.toBN(amountsDai) / web3.utils.toBN(ethFromOnesplit));

      console.log(`Total number of ETH received from purchase: ${amountsEth}`);
      console.log(`Total number of DAI received from sale of ETH: ${amountsDai}`);
      console.log(`Price to Buy: ${ethPricetoBuy}`);
      console.log(`Price to Sell: ${ethPriceToSell}`);
      
        {
        const tx = flashloan.methods.initiateFlashloan(
          flashloan.options.address, 
          addresses.tokens.dai, 
          AMOUNT_DAI_WEI
          );
        const gasprice = await web3.eth.getGasPrice();
        const gasPrice = Math.round(gasprice * 1.3);
        //    const [gasPrice, gasCost] = await Promise.all([
        //    web3.eth.getGasPrice(),
        //    tx.estimateGas({from: admin}),
        //  ]);
        //console.log(`gasPrice: ${gasPrice}`);
        //console.log(`gasCost: ${gasCost}`)
        //const txCost = web3.utils.toBN(gasCost * web3.utils.toBN(gasPrice)) * ethPrice;
        //const gasCost = web3.utils.toBN('1250000021');        
        const profit = web3.utils.toBN(amountsDai) - web3.utils.toBN(AMOUNT_DAI) - web3.utils.toBN(txCost);
        console.log(`Profit in Dai: ${profit}`);
        console.log();

        if(profit > 200) {
          console.log('Arb opportunity found DAI -> ETH!');
          console.log(`Expected profit: ${profit} Dai`);
          const params = tx.encodeABI();
          const txData = {
            from: admin,
            to: flashloan.options.address,
            daiaddress,
            AMOUNT_DAI_WEI,
            params,
            gasLimit: 4000000,            
            gasPrice
            };
          const receipt = await web3.eth.sendTransaction(txData);
          console.log(`Transaction hash: ${receipt.transactionHash}`);
        }
      }
    })
    .on('error', error => {
      console.log(error);
    });
}
init();
