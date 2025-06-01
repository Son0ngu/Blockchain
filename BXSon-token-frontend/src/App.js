import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import abi from "./BXSonTokenABI.json";
import { BXSON_TOKEN_ADDRESS } from "./config";

function App() {
  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
  const [account, setAccount] = useState();
  const [contract, setContract] = useState();
  const [tokenBalance, setTokenBalance] = useState("0");
  const [ethBalance, setEthBalance] = useState("0");
  const [tokenPrice, setTokenPrice] = useState("0");
  const [amount, setAmount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [networkOk, setNetworkOk] = useState(false);

  // Reset messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Check network
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          if (network.chainId === 31337n) {
            setNetworkOk(true);
            setError("");
          } else {
            setNetworkOk(false);
            setError("Vui lòng chuyển MetaMask sang Localhost 8545 (chainId 31337)!");
          }
        } catch (err) {
          setError("Không thể kết nối với network");
          setNetworkOk(false);
        }
      }
    };
    checkNetwork();
  }, []);

  const loadBlockchainData = async (_account) => {
    if (!networkOk) return;
    
    try {
      setLoading(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = _account || await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAccount(account);

      // Kiểm tra network trước khi gọi contract
      try {
        const network = await provider.getNetwork();
        if (network.chainId !== 31337n) {
          throw new Error("Sai network! Vui lòng chuyển sang Localhost 8545");
        }
      } catch (networkErr) {
        throw new Error("Không thể kết nối với localhost network. Hãy khởi động lại Hardhat node");
      }

      // Kiểm tra contract với timeout
      let code;
      try {
        const contractCheckPromise = provider.getCode(BXSON_TOKEN_ADDRESS);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        );
        
        code = await Promise.race([contractCheckPromise, timeoutPromise]);
        
        if (code === "0x") {
          throw new Error("Contract không tồn tại. Vui lòng deploy lại contract!");
        }
      } catch (contractErr) {
        if (contractErr.message === "Timeout") {
          throw new Error("Không thể kết nối với Hardhat node. Vui lòng khởi động lại node");
        }
        throw new Error("Contract không tồn tại hoặc địa chỉ sai. Vui lòng kiểm tra lại!");
      }

      const contract = new ethers.Contract(BXSON_TOKEN_ADDRESS, abi, signer);
      setContract(contract);

      let tBalance = "0", eBalance = "0", price = "0";

      // Lấy token balance
      try {
        const tBalanceRaw = await contract.balanceOf(account);
        tBalance = ethers.formatEther(tBalanceRaw);
      } catch (err) {
        console.error("Lỗi balanceOf:", err);
        // Không throw error, chỉ log và để giá trị mặc định
        setError("Không thể lấy token balance. Contract có thể chưa sẵn sàng.");
      }

      // Lấy ETH balance
      try {
        const eBalanceRaw = await provider.getBalance(account);
        eBalance = ethers.formatEther(eBalanceRaw);
      } catch (err) {
        console.error("Lỗi getBalance:", err);
        // ETH balance luôn có thể lấy được, nếu lỗi thì có vấn đề nghiêm trọng
      }

      // Lấy token price
      try {
        const priceRaw = await contract.tokenPrice();
        price = ethers.formatEther(priceRaw);
      } catch (err) {
        console.error("Lỗi tokenPrice:", err);
        setError("Không thể lấy giá token. Contract có thể chưa sẵn sàng.");
      }

      setTokenBalance(tBalance);
      setEthBalance(eBalance);
      setTokenPrice(price);
      
      if (!error) {
        setSuccess("Dữ liệu đã được tải thành công!");
      }

    } catch (err) {
      console.error("Lỗi loadBlockchainData:", err);
      setError(err.message || "Không thể tải dữ liệu blockchain");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum && networkOk) {
      loadBlockchainData();
      
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          loadBlockchainData(accounts[0]);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [networkOk]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Vui lòng cài đặt MetaMask!");
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      loadBlockchainData();
    } catch (err) {
      setError("Không thể kết nối ví!");
    }
  };

  const refresh = async () => {
    if (networkOk) {
      await loadBlockchainData();
    }
  };

  const buyTokens = async () => {
    if (!contract || !tokenPrice || !amount) {
      setError("Vui lòng đợi contract được tải hoặc nhập số lượng!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const value = ethers.parseEther((parseFloat(amount) * parseFloat(tokenPrice)).toString());
      const tx = await contract.buyTokens({ value });
      
      setSuccess("Giao dịch đang được xử lý...");
      await tx.wait();
      
      setSuccess("Mua token thành công!");
      await refresh();
    } catch (err) {
      console.error("Lỗi mua token:", err);
      setError(err.message || "Giao dịch mua token thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const sellTokens = async () => {
    if (!contract || !amount) {
      setError("Vui lòng đợi contract được tải hoặc nhập số lượng!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const tokenAmount = ethers.parseEther(amount.toString());
      const tx = await contract.sellTokens(tokenAmount);
      
      setSuccess("Giao dịch đang được xử lý...");
      await tx.wait();
      
      setSuccess("Bán token thành công!");
      await refresh();
    } catch (err) {
      console.error("Lỗi bán token:", err);
      setError(err.message || "Giao dịch bán token thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const resetAndReload = () => {
    // Clear all states
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setContract(null);
    setTokenBalance("0");
    setEthBalance("0");
    setTokenPrice("0");
    setError("");
    setSuccess("");
    
    // Reload page
    window.location.reload();
  };

  if (!window.ethereum) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>BXSon Token</h2>
          <div style={styles.errorMessage}>
            <p>Vui lòng cài đặt MetaMask để sử dụng ứng dụng này!</p>
          </div>
        </div>
      </div>
    );
  }

  if (!networkOk) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>BXSon Token</h2>
          <div style={styles.errorMessage}>
            <p>Vui lòng chuyển MetaMask sang Localhost 8545 (chainId 31337)!</p>
            <button onClick={resetAndReload} style={styles.secondaryButton}>
              Reload & Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>BXSon Token</h2>
          <button onClick={connectWallet} style={styles.primaryButton}>
            Kết nối ví
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>BXSon Token</h2>
        
        {/* Account Info */}
        <div style={styles.section}>
          <div style={styles.accountCard}>
            <h3 style={styles.sectionTitle}>Tài khoản</h3>
            <p style={styles.address}>{account}</p>
          </div>
          
          <div style={styles.balanceGrid}>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>ETH Balance</div>
              <div style={styles.balanceValue}>{parseFloat(ethBalance).toFixed(4)} ETH</div>
            </div>
            
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Token Balance</div>
              <div style={styles.balanceValue}>{parseFloat(tokenBalance).toFixed(4)} BXS</div>
            </div>
          </div>
          
          <div style={styles.priceCard}>
            <div style={styles.balanceLabel}>Giá hiện tại</div>
            <div style={styles.priceValue}>{parseFloat(tokenPrice).toFixed(6)} ETH / BXS</div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={styles.errorMessage}>
            <p>{error}</p>
            {error.includes("Hardhat") && (
              <button onClick={resetAndReload} style={{...styles.secondaryButton, marginTop: "8px"}}>
                Reset & Reload
              </button>
            )}
          </div>
        )}
        
        {success && (
          <div style={styles.successMessage}>
            <p>{success}</p>
          </div>
        )}

        {/* Trading Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Giao dịch</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Số lượng</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button 
              onClick={buyTokens} 
              style={styles.primaryButton}
              disabled={loading || !amount || !contract}
            >
              {loading ? "Đang xử lý..." : "Mua Token"}
            </button>
            
            <button 
              onClick={sellTokens} 
              style={styles.dangerButton}
              disabled={loading || !amount || !contract}
            >
              {loading ? "Đang xử lý..." : "Bán Token"}
            </button>
          </div>

          <button 
            onClick={refresh} 
            style={styles.secondaryButton}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {/* Contract Info */}
        <div style={styles.contractInfo}>
          <div style={styles.contractLabel}>Contract Address</div>
          <div style={styles.contractAddress}>{BXSON_TOKEN_ADDRESS}</div>
          <div style={styles.contractLabel} style={{marginTop: "8px"}}>
            Status: {contract ? "✅ Connected" : "❌ Not Connected"}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    maxWidth: "500px",
    width: "100%",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0"
  },
  title: {
    textAlign: "center",
    marginBottom: "32px",
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1a202c",
    letterSpacing: "-0.025em"
  },
  section: {
    marginBottom: "24px"
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "16px"
  },
  accountCard: {
    background: "#f7fafc",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "16px",
    border: "1px solid #e2e8f0"
  },
  address: {
    fontSize: "0.875rem",
    fontFamily: "Monaco, 'Cascadia Code', monospace",
    color: "#4a5568",
    wordBreak: "break-all",
    margin: "8px 0 0 0",
    background: "#edf2f7",
    padding: "8px",
    borderRadius: "6px"
  },
  balanceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "16px"
  },
  balanceCard: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    textAlign: "center"
  },
  priceCard: {
    background: "#f0fff4",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #c6f6d5",
    textAlign: "center"
  },
  balanceLabel: {
    fontSize: "0.875rem",
    color: "#718096",
    marginBottom: "4px",
    fontWeight: "500"
  },
  balanceValue: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#2d3748"
  },
  priceValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#22543d"
  },
  inputGroup: {
    marginBottom: "16px"
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#374151"
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box"
  },
  buttonGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px"
  },
  primaryButton: {
    background: "#3b82f6",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    outline: "none"
  },
  secondaryButton: {
    background: "#6b7280",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    outline: "none",
    width: "100%"
  },
  dangerButton: {
    background: "#ef4444",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    outline: "none"
  },
  errorMessage: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "0.875rem",
    textAlign: "center"
  },
  successMessage: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#16a34a",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "0.875rem",
    textAlign: "center"
  },
  contractInfo: {
    textAlign: "center",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0"
  },
  contractLabel: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    marginBottom: "4px",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  contractAddress: {
    fontFamily: "Monaco, 'Cascadia Code', monospace",
    fontSize: "0.75rem",
    color: "#6b7280",
    wordBreak: "break-all"
  }
};

export default App;
