// scripts/genWallet.js
const { ethers } = require("hardhat");

async function main() {
  const wallet = ethers.Wallet.createRandom();
  console.log("Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
}

main();
