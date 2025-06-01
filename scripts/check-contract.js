const { ethers } = require("hardhat");

async function main() {
  const contractAddresses = [
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  ];
  
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  
  console.log("🔍 Checking contract addresses...\n");
  
  for (const address of contractAddresses) {
    try {
      const code = await provider.getCode(address);
      
      if (code === "0x") {
        console.log(`❌ ${address}: No contract found`);
      } else {
        console.log(`✅ ${address}: Contract exists`);
        
        // Try to call contract
        const BXSonToken = await ethers.getContractFactory("BXSon");
        const contract = BXSonToken.attach(address);
        
        try {
          const name = await contract.name();
          const symbol = await contract.symbol();
          console.log(`   📝 Name: ${name}, Symbol: ${symbol}`);
        } catch (error) {
          console.log(`   ❌ Error calling contract: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${address}: Error checking - ${error.message}`);
    }
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });