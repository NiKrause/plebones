import {useTipsAmount} from '../../hooks/plebbit-tipping-v1'
import styles from './comment-tip.module.css'

const TipDisplay = ({comment, subplebbit}) => {
  const {tipsAmountEth, isLoading, error, lastUpdated, refreshTipsAmount} = useTipsAmount({comment, subplebbit})

  // Don't show if no tips and not loading
  if (parseFloat(tipsAmountEth) === 0 && !isLoading) {
    return null
  }

  const handleRefresh = (e) => {
    e.preventDefault()
    e.stopPropagation()
    refreshTipsAmount()
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
    return date.toLocaleDateString()
  }

  return (
    <div className={styles.tipDisplay}>
      <span className={styles.tipIcon}>💎</span>
      <span className={styles.tipAmount}>
        {isLoading ? (
          <span className={styles.loading}>Loading...</span>
        ) : error ? (
          <span className={styles.error} title={error.message}>
            Error
          </span>
        ) : (
          <>{tipsAmountEth} ETH</>
        )}
      </span>
      {lastUpdated && (
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          title={`Last updated: ${formatLastUpdated(lastUpdated)}. Click to refresh.`}
          disabled={isLoading}
        >
          🔄
        </button>
      )}
    </div>
  )
}

export default TipDisplay
