const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BXSon Token...");
  
  // Get the ContractFactory
  const BXSonToken = await ethers.getContractFactory("BXSon");
  
  // Deploy the contract
  const bxsonToken = await BXSonToken.deploy();
  
  // Wait for deployment to finish
  await bxsonToken.waitForDeployment();
  
  const contractAddress = await bxsonToken.getAddress();
  
  console.log("🚀 BXSon Token deployed to:", contractAddress);
  console.log("📝 Update your config.js with this address:");
  console.log(`export const BXSON_TOKEN_ADDRESS = "${contractAddress}";`);
  
  // Verify deployment
  try {
    const name = await bxsonToken.name();
    const symbol = await bxsonToken.symbol();
    const totalSupply = await bxsonToken.totalSupply();
    const tokenPrice = await bxsonToken.tokenPrice();
    
    console.log("\n✅ Contract verification:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Total Supply:", ethers.formatEther(totalSupply));
    console.log("- Initial Price:", ethers.formatEther(tokenPrice), "ETH");
  } catch (error) {
    console.log("❌ Error verifying contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
