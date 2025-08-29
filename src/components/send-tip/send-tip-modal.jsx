import {useState, useEffect} from 'react'
import {useSendTip} from '../../hooks/plebbit-tipping-v1'
import styles from './send-tip.module.css'

const SendTipModal = ({comment, subplebbit, onClose}) => {
  const [customAmount, setCustomAmount] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const {sendTip, tip, isLoading, error, canTip, recipientWallet} = useSendTip({comment, subplebbit})

  // Show success message when tip is sent
  useEffect(() => {
    if (tip && tip.transactionHash) {
      setShowSuccess(true)
      // Auto-close modal after 3 seconds
      setTimeout(() => {
        onClose()
      }, 3000)
    }
  }, [tip, onClose])

  const handleSendTip = async () => {
    await sendTip(customAmount || null)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Send Tip</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          {showSuccess ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✅</div>
              <h4>Tip Sent Successfully!</h4>
              <p>Transaction Hash:</p>
              <div className={styles.transactionHash}>{tip.transactionHash}</div>
              <p>Closing in 3 seconds...</p>
            </div>
          ) : (
            <>
              <div className={styles.recipientInfo}>
                <p>
                  <strong>Recipient:</strong> {comment?.author?.displayName || 'Anonymous'}
                </p>
                <p>
                  <strong>Wallet:</strong> {formatAddress(recipientWallet)}
                </p>
              </div>

              {!canTip && (
                <div className={styles.warningMessage}>
                  {!comment?.cid && <p>⚠️ Comment CID is required</p>}
                  {!recipientWallet && <p>⚠️ Recipient wallet address not found</p>}
                  {comment?.cid && recipientWallet && <p>⚠️ Your wallet is not configured</p>}
                </div>
              )}

              <div className={styles.amountSection}>
                <label htmlFor="customAmount">Tip Amount (ETH) - Leave empty for minimum amount</label>
                <input
                  id="customAmount"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="e.g., 0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  disabled={isLoading || !canTip}
                />
                <p className={styles.amountHint}>If empty, will use 2x the contract's minimum tip amount</p>
              </div>

              {error && (
                <div className={styles.errorMessage}>
                  <p>❌ Error: {error.message}</p>
                </div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.cancelButton} onClick={onClose} disabled={isLoading}>
                  Cancel
                </button>
                <button className={styles.sendButton} onClick={handleSendTip} disabled={isLoading || !canTip}>
                  {isLoading ? 'Sending...' : 'Send Tip'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SendTipModal
