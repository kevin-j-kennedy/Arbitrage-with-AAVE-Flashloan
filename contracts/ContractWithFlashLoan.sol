pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "@studydefi/money-legos/aave/contracts/ILendingPool.sol";
import "@studydefi/money-legos/aave/contracts/IFlashLoanReceiver.sol";
import "@studydefi/money-legos/aave/contracts/FlashloanReceiverBase.sol";
import "@studydefi/money-legos/onesplit/contracts/IOneSplit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ContractWithFlashLoan is FlashLoanReceiverBase {
    address constant AaveLendingPoolAddressProviderAddress = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8; 
    address constant ethaddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address constant daiaddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    event NewArbitrage (
      uint profit,
      uint date
    );

    IOneSplit onesplit;
    IERC20 eth;
    IERC20 dai;
    address beneficiary;

    constructor(
        address onesplitAddress,
        address ethAddress,
        address daiAddress,
        address beneficiaryAddress
    ) public {
      onesplit = IOneSplit(onesplitAddress);
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
 
        uint256 balanceDai = dai.balanceOf(address(this));

          //Buy ETH on OneSplit
          dai.approve(address(onesplit), balanceDai); 
          (uint256 returnAmount, uint256[] memory distribution) = IOneSplit(
              onesplit
          ).getExpectedReturn(
              IERC20(daiaddress),
              IERC20(ethaddress),
              balanceDai,
              10,
              0
          );

          IOneSplit(onesplit).swap(
              IERC20(daiaddress),
              IERC20(ethaddress), 
              balanceDai,
              returnAmount,
              distribution,
              0
          );

          //Sell ETH on OneSplit
          IOneSplit(
              onesplit
          ).getExpectedReturn(
              IERC20(ethaddress),
              IERC20(daiaddress),  
              address(this).balance,
              10,
              0
          );

        IOneSplit(onesplit).swap.value(address(this).balance)(
              IERC20(ethaddress),
              IERC20(daiaddress),  
              address(this).balance,
              returnAmount,
              distribution,
              0
          );

        require(
            dai.balanceOf(address(this)) >= (_amount.add(_fee)),
            "Not enough funds to repay loan!"
        );

        uint profit = dai.balanceOf(address(this)) - (_amount.add(_fee)); 
        dai.transfer(beneficiary, profit);
        emit NewArbitrage(profit, now);
    
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
