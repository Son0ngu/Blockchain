const { ethers } = require("hardhat");
const path = require("path");

async function main() {
  console.log("Deploying BXSon Token with deterministic address...");
  
  // Get the first account (always the same on Hardhat)
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get current nonce to predict address
  const nonce = await deployer.getNonce();
  console.log("Current nonce:", nonce);
  
  // Predict contract address
  const predictedAddress = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce
  });
  console.log("Predicted contract address:", predictedAddress);
  
  // Get the ContractFactory
  const BXSonToken = await ethers.getContractFactory("BXSon");
  
  // Deploy the contract
  const bxsonToken = await BXSonToken.deploy();
  
  // Wait for deployment to finish
  await bxsonToken.waitForDeployment();
  
  const contractAddress = await bxsonToken.getAddress();
  
  console.log("🚀 BXSon Token deployed to:", contractAddress);
  console.log("✅ Address matches prediction:", contractAddress === predictedAddress);
  
  // Write address to file với đường dẫn đúng
  const fs = require('fs');
  const configPath = path.join(__dirname, '..', 'BXSon-token-frontend', 'src', 'config.js');
  const configContent = `export const BXSON_TOKEN_ADDRESS = "${contractAddress}";`;
  
  try {
    fs.writeFileSync(configPath, configContent);
    console.log("📝 Config file updated automatically!");
    console.log("📍 Updated file:", configPath);
  } catch (error) {
    console.log("❌ Error writing config file:", error.message);
    console.log("📝 Please manually update config.js with:");
    console.log(`export const BXSON_TOKEN_ADDRESS = "${contractAddress}";`);
  }
  
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