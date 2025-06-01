// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BXSon is ERC20 {
    address public owner;
    uint256 public tokenPrice;
    uint256 public lastPriceUpdateTime;
    uint256 public constant INITIAL_PRICE = 5 ether;
    uint256 public constant INTEREST_DENOMINATOR = 2 * 1e9;
    uint256 public constant TOTAL_SUPPLY = 100_000 * 1e18;

    event Bought(address indexed buyer, uint256 amount, uint256 price);
    event Sold(address indexed seller, uint256 amount, uint256 price);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() ERC20("BXSon", "BXS") {
        owner = msg.sender;
        _mint(owner, TOTAL_SUPPLY);
        tokenPrice = INITIAL_PRICE;
        lastPriceUpdateTime = block.timestamp;
    }

    function updatePrice() public {
        uint256 daysPassed = (block.timestamp - lastPriceUpdateTime) / 1 days;
        if (daysPassed > 0) {
            uint256 interestRate = address(this).balance / INTEREST_DENOMINATOR;
            for (uint256 i = 0; i < daysPassed; i++) {
                tokenPrice += interestRate;
            }
            lastPriceUpdateTime += daysPassed * 1 days;
        }
    }

    function buyTokens() external payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        updatePrice();
        uint256 amount = (msg.value * 1e18) / tokenPrice;
        require(balanceOf(owner) >= amount, "Not enough tokens left");
        _transfer(owner, msg.sender, amount);
        emit Bought(msg.sender, amount, tokenPrice);
    }

    function sellTokens(uint256 tokenAmount) external {
        require(balanceOf(msg.sender) >= tokenAmount, "Not enough tokens");
        updatePrice();
        uint256 ethAmount = (tokenAmount * tokenPrice) / 1e18;
        require(address(this).balance >= ethAmount, "Contract has insufficient ETH");
        _transfer(msg.sender, owner, tokenAmount);
        payable(msg.sender).transfer(ethAmount);
        emit Sold(msg.sender, tokenAmount, tokenPrice);
    }

    receive() external payable {}

    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient ETH");
        payable(owner).transfer(amount);
    }
}
