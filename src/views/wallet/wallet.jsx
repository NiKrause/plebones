import {useState, useEffect, useCallback} from 'react'
import {useAccount} from '@plebbit/plebbit-react-hooks'
import styles from './wallet.module.css'

const Wallet = () => {
  const [balance, setBalance] = useState(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [balanceError, setBalanceError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const account = useAccount()

  const walletAddress = account?.author?.wallets?.eth?.address
  const hasWallet = !!walletAddress

  // Function to fetch ETH balance
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null)
      return
    }

    setIsLoadingBalance(true)
    setBalanceError(null)

    try {
      // Using Sepolia testnet RPC
      const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [walletAddress, 'latest'],
          id: 1,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      // Convert wei to ETH
      const balanceWei = BigInt(data.result)
      const balanceEth = Number(balanceWei) / Math.pow(10, 18)

      setBalance(balanceEth)
      setLastUpdated(Date.now())
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      setBalanceError(error.message)
      setBalance(null)
    } finally {
      setIsLoadingBalance(false)
    }
  }, [walletAddress])

  // Initial balance fetch
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!walletAddress) return

    const intervalId = setInterval(fetchBalance, 30000)
    return () => clearInterval(intervalId)
  }, [walletAddress, fetchBalance])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`
  }

  const formatBalance = (balance) => {
    if (balance === null) return 'Unknown'
    if (balance === 0) return '0 ETH'
    if (balance < 0.001) return balance.toExponential(3) + ' ETH'
    if (balance < 1) return balance.toFixed(6).replace(/\.?0+$/, '') + ' ETH'
    return balance.toFixed(4).replace(/\.?0+$/, '') + ' ETH'
  }

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return date.toLocaleString()
  }

  const handleCopyAddress = async () => {
    if (!walletAddress) return

    try {
      await navigator.clipboard.writeText(walletAddress)
      // Could add a toast notification here
      console.log('Address copied to clipboard')
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  const handleRefreshBalance = () => {
    fetchBalance()
  }

  return (
    <div className={styles.wallet}>
      <div className={styles.header}>
        <h1>Wallet</h1>
        <p>Manage your Ethereum wallet for tipping</p>
      </div>

      {!hasWallet ? (
        <div className={styles.noWallet}>
          <div className={styles.noWalletIcon}>💸</div>
          <h2>No Wallet Configured</h2>
          <p>To send and receive tips, you need to configure an Ethereum wallet in your Plebbit account.</p>
          <div className={styles.instructions}>
            <h3>How to add a wallet:</h3>
            <ol>
              <li>Generate an Ethereum private key using a wallet like MetaMask</li>
              <li>Add the wallet to your Plebbit account settings</li>
              <li>Make sure to use Sepolia testnet for testing</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className={styles.walletInfo}>
          <div className={styles.walletCard}>
            <div className={styles.walletHeader}>
              <h2>Your Wallet</h2>
              <div className={styles.network}>Sepolia Testnet</div>
            </div>

            <div className={styles.addressSection}>
              <label>Address:</label>
              <div className={styles.addressDisplay}>
                <span className={styles.address}>{formatAddress(walletAddress)}</span>
                <button className={styles.copyButton} onClick={handleCopyAddress} title="Copy full address">
                  📋
                </button>
              </div>
              <div className={styles.fullAddress}>{walletAddress}</div>
            </div>

            <div className={styles.balanceSection}>
              <label>Balance:</label>
              <div className={styles.balanceDisplay}>
                {isLoadingBalance ? (
                  <span className={styles.loading}>Loading...</span>
                ) : balanceError ? (
                  <span className={styles.error}>Error: {balanceError}</span>
                ) : (
                  <span className={styles.balance}>{formatBalance(balance)}</span>
                )}
                <button className={styles.refreshButton} onClick={handleRefreshBalance} disabled={isLoadingBalance} title="Refresh balance">
                  🔄
                </button>
              </div>
              {lastUpdated && <div className={styles.lastUpdated}>Last updated: {formatLastUpdated(lastUpdated)}</div>}
            </div>

            <div className={styles.actions}>
              <h3>Need testnet ETH?</h3>
              <p>Use these Sepolia faucets to get test ETH:</p>
              <div className={styles.faucetLinks}>
                <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className={styles.faucetLink}>
                  Sepolia Faucet 1
                </a>
                <a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noopener noreferrer" className={styles.faucetLink}>
                  Alchemy Faucet
                </a>
                <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noopener noreferrer" className={styles.faucetLink}>
                  Google Faucet
                </a>
              </div>
            </div>
          </div>

          <div className={styles.tipsSection}>
            <h2>Tipping Activity</h2>
            <p>
              Your tipping activity will be tracked on the blockchain. You can view all transactions using a block explorer like{' '}
              <a href={`https://sepolia.etherscan.io/address/${walletAddress}`} target="_blank" rel="noopener noreferrer">
                Sepolia Etherscan
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wallet
