// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Fixed revenue splits. Payments in BOT or any ERC-20 are divided by basis points; each recipient withdraws its share. No fee.
contract Splitter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Split {address creator; string name; address[] recipients; uint16[] shares; uint256 payments;}
    Split[] private splits;
    /// @dev account => token (address(0) = native BOT) => amount withdrawable
    mapping(address=>mapping(address=>uint256)) public owed;
    mapping(uint256=>mapping(address=>uint256)) public received;
    event SplitCreated(uint256 indexed id,address indexed creator,string name);
    event Paid(uint256 indexed id,address indexed from,address indexed token,uint256 amount);
    event Withdrawn(address indexed account,address indexed token,uint256 amount);

    function create(string calldata name,address[] calldata recipients,uint16[] calldata shares) external returns(uint256 id) {
        uint256 n=recipients.length; require(n>=2&&n<=10&&n==shares.length,"2-10 recipients");
        require(bytes(name).length>0&&bytes(name).length<=80,"name 1-80 chars");
        uint256 sum;
        for(uint256 i;i<n;i++){
            require(recipients[i]!=address(0)&&shares[i]>0,"bad recipient");
            for(uint256 k;k<i;k++)require(recipients[k]!=recipients[i],"duplicate recipient");
            sum+=shares[i];
        }
        require(sum==10000,"shares must total 100%");
        id=splits.length; splits.push(Split(msg.sender,name,recipients,shares,0)); emit SplitCreated(id,msg.sender,name);
    }
    function pay(uint256 id) external payable {require(msg.value>0,"no payment");_split(id,address(0),msg.value);}
    function payToken(uint256 id,address token,uint256 amount) external nonReentrant {
        require(token!=address(0)&&amount>0,"no payment");
        uint256 before=IERC20(token).balanceOf(address(this)); IERC20(token).safeTransferFrom(msg.sender,address(this),amount);
        _split(id,token,IERC20(token).balanceOf(address(this))-before);
    }
    function withdraw(address token) external nonReentrant {
        uint256 amount=owed[msg.sender][token]; require(amount>0,"nothing due"); owed[msg.sender][token]=0;
        if(token==address(0)){(bool ok,)=msg.sender.call{value:amount}("");require(ok,"transfer failed");}
        else IERC20(token).safeTransfer(msg.sender,amount);
        emit Withdrawn(msg.sender,token,amount);
    }
    function _split(uint256 id,address token,uint256 amount) private {
        require(id<splits.length,"no split"); Split storage s=splits[id]; uint256 n=s.recipients.length; uint256 left=amount;
        for(uint256 i;i<n-1;i++){uint256 part=amount*s.shares[i]/10000;owed[s.recipients[i]][token]+=part;left-=part;}
        owed[s.recipients[n-1]][token]+=left; // rounding dust goes to the last recipient
        s.payments++; received[id][token]+=amount; emit Paid(id,msg.sender,token,amount);
    }
    function splitCount() external view returns(uint256){return splits.length;}
    function getSplit(uint256 id) external view returns(Split memory){require(id<splits.length,"no split");return splits[id];}
}
