// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Splitter} from "../src/Splitter.sol";

contract SplitUSD is ERC20 {constructor() ERC20("USDT test fixture","USDT"){} function decimals() public pure override returns(uint8){return 6;} function mint(address a,uint256 n) external {_mint(a,n);}}

contract SplitterTest is Test {
    address a=address(0xA);address b=address(0xB);address c=address(0xC);address payer=address(0xFEE);
    Splitter s;SplitUSD usd;
    function setUp() public {s=new Splitter();usd=new SplitUSD();vm.deal(payer,10 ether);usd.mint(payer,100e6);}
    function _three() internal returns(uint256){
        address[] memory r=new address[](3);r[0]=a;r[1]=b;r[2]=c;uint16[] memory sh=new uint16[](3);sh[0]=5000;sh[1]=3333;sh[2]=1667;
        return s.create("Gig night",r,sh);
    }
    function test_botSplitWithDustToLast() public {
        uint256 id=_three();vm.prank(payer);s.pay{value:1 ether+1}(id);
        uint256 pa=s.owed(a,address(0));uint256 pb=s.owed(b,address(0));uint256 pc=s.owed(c,address(0));
        assertEq(pa+pb+pc,1 ether+1);assertEq(pa,uint256(1 ether+1)*5000/10000);
        vm.prank(c);s.withdraw(address(0));assertEq(c.balance,pc);
        vm.prank(c);vm.expectRevert(bytes("nothing due"));s.withdraw(address(0));
    }
    function test_tokenSplit() public {
        uint256 id=_three();vm.startPrank(payer);usd.approve(address(s),10e6);s.payToken(id,address(usd),10e6);vm.stopPrank();
        assertEq(s.owed(a,address(usd)),5e6);assertEq(s.received(id,address(usd)),10e6);
        vm.prank(a);s.withdraw(address(usd));assertEq(usd.balanceOf(a),5e6);
    }
    function test_rejectsBadSplits() public {
        address[] memory r=new address[](2);r[0]=a;r[1]=a;uint16[] memory sh=new uint16[](2);sh[0]=5000;sh[1]=5000;
        vm.expectRevert(bytes("duplicate recipient"));s.create("x",r,sh);
        r[1]=b;sh[1]=4000;vm.expectRevert(bytes("shares must total 100%"));s.create("x",r,sh);
        address[] memory one=new address[](1);one[0]=a;uint16[] memory full=new uint16[](1);full[0]=10000;
        vm.expectRevert(bytes("2-10 recipients"));s.create("x",one,full);
    }
}
