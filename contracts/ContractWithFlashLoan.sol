pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@studydefi/money-legos/aave/contracts/ILendingPool.sol";
import "@studydefi/money-legos/aave/contracts/IFlashLoanReceiver.sol";
import "@studydefi/money-legos/aave/contracts/FlashloanReceiverBase.sol";
import "@studydefi/money-legos/onesplit/contracts/IOneSplit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ContractWithFlashLoan is FlashLoanReceiverBase {
    address constant daiaddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant ethaddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address constant onesplitaddress = 0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E;
    address constant AaveLendingPoolAddressProviderAddress = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8; 

    struct ArbInfo {
        uint repayAmount;
    }

    event NewArbitrage (
      uint profit,
      uint date
    );

    IERC20 eth;
    IERC20 dai;
    address beneficiary;

    constructor(
        address ethAddress,
        address daiAddress,
        address beneficiaryAddress
    ) public {
      eth = IERC20(ethAddress);
      dai = IERC20(daiAddress);
      beneficiary = beneficiaryAddress;
    }

        // Function is called when loan is given to contract
        // Do your logic here, e.g. arbitrage, liquidate compound, etc
        // Note that if you don't do your logic, it WILL fail

    function executeOperation(
        address _reserve,
        uint _amount,
        uint _fee,
        bytes calldata _params
    ) external {
 
        ArbInfo memory arbInfo = abi.decode(_params, (ArbInfo));
        uint256 balanceDai = dai.balanceOf(address(this));

          //Buy ETH on OneSplit
          dai.approve(address(onesplitaddress), balanceDai); 
          (uint256 returnAmount, uint256[] memory distribution) = IOneSplit(
              onesplitaddress
          ).getExpectedReturn(
              dai,
              IERC20(ethaddress),
              balanceDai,
              10,
              0
          );

          IOneSplit(onesplitaddress).swap(
              dai,
              IERC20(ethaddress),  
              balanceDai,
              returnAmount,
              distribution,
              0
          );

          //Sell ETH on OneSplit
          IOneSplit(
              onesplitaddress
          ).getExpectedReturn(
              IERC20(ethaddress),
              dai,  
              address(this).balance,
              10,
              0
          );

          IOneSplit(onesplitaddress).swap(
              IERC20(ethaddress),
              dai,  
              address(this).balance,
              returnAmount,
              distribution,
              0
          );
        

        require(
            dai.balanceOf(address(this)) >= arbInfo.repayAmount,
            "Not enough funds to repay dydx loan!"
        );

        uint profit = dai.balanceOf(address(this)) - arbInfo.repayAmount; 
        dai.transfer(beneficiary, profit);
        emit NewArbitrage(profit, now);
    
        // TODO: Change line below
        revert("Hello, you haven't implemented your flashloan logic");

        transferFundsBackToPoolInternal(_reserve, _amount.add(_fee));
    }

    // Entry point
    function initateFlashLoan(
        address reserve,
        address assetToFlashLoan,
        uint256 amountToLoan, 
        bytes calldata _params
    ) external {
        // Get Aave lending pool
        ILendingPool lendingPool = ILendingPool(
            ILendingPoolAddressesProvider(AaveLendingPoolAddressProviderAddress)
                .getLendingPool()
        );

        // Ask for a flashloan
        // LendingPool will now execute the `executeOperation` function above
        lendingPool.flashLoan(
            reserve, // Which address to callback into
            assetToFlashLoan,
            amountToLoan,
            _params    
        );
    }
}
