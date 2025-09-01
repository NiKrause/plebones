import {useTippingActivity} from '../../hooks/plebbit-tipping-v1'
import {ethers} from 'ethers'
import styles from './tipping-activity.module.css'

const TippingActivity = ({walletAddress}) => {
  const {tippingActivity, isLoading, error, lastUpdated, refreshActivity, totalSent, totalReceived, sentCount, receivedCount} = useTippingActivity({walletAddress})

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const formatAmount = (amount) => {
    if (!amount) return '0'
    try {
      const ethAmount = ethers.formatEther(amount)
      const numAmount = parseFloat(ethAmount)
      if (numAmount < 0.001) return numAmount.toExponential(3)
      if (numAmount < 1) return numAmount.toFixed(6).replace(/\.?0+$/, '')
      return numAmount.toFixed(4).replace(/\.?0+$/, '')
    } catch (error) {
      return '0'
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getEtherscanUrl = (transactionHash) => {
    const baseUrl = import.meta.env.VITE_ETHERSCAN_BASE_URL || 'https://sepolia.etherscan.io'
    return `${baseUrl}/tx/${transactionHash}`
  }

  const getAddressEtherscanUrl = (address) => {
    const baseUrl = import.meta.env.VITE_ETHERSCAN_BASE_URL || 'https://sepolia.etherscan.io'
    return `${baseUrl}/address/${address}`
  }

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleString()
  }

  const handleRefresh = () => {
    refreshActivity()
  }

  if (!walletAddress) {
    return (
      <div className={styles.tippingActivity}>
        <h2>Tipping Activity</h2>
        <p>Connect a wallet to view your tipping activity.</p>
      </div>
    )
  }

  return (
    <div className={styles.tippingActivity}>
      <div className={styles.header}>
        <h2>Tipping Activity</h2>
        <div className={styles.actions}>
          <button className={styles.refreshButton} onClick={handleRefresh} disabled={isLoading} title="Refresh activity">
            🔄
          </button>
          <a href={getAddressEtherscanUrl(walletAddress)} target="_blank" rel="noopener noreferrer" className={styles.etherscanLink}>
            View on Etherscan
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      <div className={styles.summary}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Sent</div>
          <div className={styles.statValue}>{formatAmount(totalSent)} ETH</div>
          <div className={styles.statCount}>({sentCount} tips)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Received</div>
          <div className={styles.statValue}>{formatAmount(totalReceived)} ETH</div>
          <div className={styles.statCount}>({receivedCount} tips)</div>
        </div>
      </div>

      {lastUpdated && <div className={styles.lastUpdated}>Last updated: {formatLastUpdated(lastUpdated)}</div>}

      {/* Activity Table */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}>🔄</div>
            <p>Loading tipping activity...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <p>❌ Error loading activity: {error.message}</p>
            <button className={styles.retryButton} onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        ) : tippingActivity.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💸</div>
            <h3>No tipping activity yet</h3>
            <p>Your sent and received tips will appear here.</p>
          </div>
        ) : (
          <table className={styles.activityTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>From/To</th>
                <th>Date</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {tippingActivity.map((activity, index) => (
                <tr key={`${activity.transactionHash}-${index}`} className={styles.activityRow}>
                  <td>
                    <div className={`${styles.type} ${styles[activity.type]}`}>{activity.type === 'sent' ? <>📤 Sent</> : <>📥 Received</>}</div>
                  </td>
                  <td className={styles.amount}>{formatAmount(activity.amount)} ETH</td>
                  <td>
                    {activity.type === 'sent' ? (
                      <div className={styles.address}>
                        <span>To: </span>
                        <a href={getAddressEtherscanUrl(activity.recipient)} target="_blank" rel="noopener noreferrer" className={styles.addressLink}>
                          {formatAddress(activity.recipient)}
                        </a>
                      </div>
                    ) : (
                      <div className={styles.address}>
                        <span>From: </span>
                        <a href={getAddressEtherscanUrl(activity.sender)} target="_blank" rel="noopener noreferrer" className={styles.addressLink}>
                          {formatAddress(activity.sender)}
                        </a>
                      </div>
                    )}
                  </td>
                  <td className={styles.date}>{formatDate(activity.timestamp)}</td>
                  <td>
                    <a
                      href={getEtherscanUrl(activity.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.transactionLink}
                      title={activity.transactionHash}
                    >
                      View on Etherscan
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default TippingActivity
