import {useState, useEffect} from 'react'
import {useSendTip} from '../../hooks/plebbit-tipping-v1'
import {ethers} from 'ethers'
import styles from './send-tip.module.css'

const SendTipModal = ({comment, subplebbit, onClose}) => {
  const [customAmount, setCustomAmount] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [autoCloseTimer, setAutoCloseTimer] = useState(null)
  const [countdown, setCountdown] = useState(10)

  const {
    sendTip,
    tip,
    isLoading,
    error,
    canTip,
    recipientWallet,
    transactionHash,
    transactionStatus,
    currentBlock,
    confirmations,
    getCurrentBlock,
    currentTipAmount,
    minimumTipAmount,
    getMinimumTipAmount,
  } = useSendTip({comment, subplebbit})

  // Show success message when tip is confirmed
  useEffect(() => {
    if (transactionStatus === 'confirmed') {
      setShowSuccess(true)
      setCountdown(10) // Reset countdown to 10 seconds
    } else {
      setShowSuccess(false)
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer)
        setAutoCloseTimer(null)
      }
    }
  }, [transactionStatus])

  // Handle countdown timer
  useEffect(() => {
    let countdownInterval

    if (showSuccess && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Close modal when countdown reaches 0
            onClose()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [showSuccess, countdown, onClose])

  // Load current block and minimum tip amount when modal opens
  useEffect(() => {
    getCurrentBlock()
    getMinimumTipAmount()
  }, [getCurrentBlock, getMinimumTipAmount])

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

  const formatTransactionHash = (hash) => {
    if (!hash) return ''
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`
  }

  const getEtherscanUrl = (transactionHash) => {
    const baseUrl = import.meta.env.VITE_ETHERSCAN_BASE_URL || 'https://sepolia.etherscan.io'
    return `${baseUrl}/tx/${transactionHash}`
  }

  const getStatusMessage = () => {
    switch (transactionStatus) {
      case 'sending':
        return '📤 Creating and sending transaction...'
      case 'pending':
        return `⏳ Transaction pending (waiting for confirmation)...`
      case 'confirmed':
        return `✅ Transaction confirmed! (${confirmations} confirmation${confirmations !== 1 ? 's' : ''})`
      case 'failed':
        return '❌ Transaction failed'
      default:
        return null
    }
  }

  const getProgressContent = () => {
    if (transactionStatus === 'idle' || (!transactionHash && !isLoading)) {
      return null
    }

    return (
      <div className={styles.progressSection}>
        <div className={styles.statusMessage}>{getStatusMessage()}</div>

        {currentTipAmount && (
          <div className={styles.tipAmountInfo}>
            <p>
              <strong>Tip Amount:</strong> {parseFloat(ethers.formatEther(currentTipAmount)).toFixed(6)} ETH
            </p>
          </div>
        )}

        {transactionHash && (
          <div className={styles.transactionInfo}>
            <p>
              <strong>Transaction Hash:</strong>
            </p>
            <div className={styles.transactionHash}>
              <a href={getEtherscanUrl(transactionHash)} target="_blank" rel="noopener noreferrer" title={transactionHash} className={styles.transactionLink}>
                {formatTransactionHash(transactionHash)}
              </a>
              <button className={styles.copyButton} onClick={() => navigator.clipboard.writeText(transactionHash)} title="Copy full transaction hash">
                📋
              </button>
            </div>
          </div>
        )}

        {currentBlock && (
          <div className={styles.blockInfo}>
            <p>
              <strong>Current Block:</strong> #{currentBlock}
            </p>
            {transactionStatus === 'confirmed' && confirmations > 0 && (
              <p>
                <strong>Confirmations:</strong> {confirmations}
              </p>
            )}
          </div>
        )}

        {(transactionStatus === 'sending' || transactionStatus === 'pending') && <div className={styles.spinner}>🔄</div>}
      </div>
    )
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
              <h4>Tip Confirmed!</h4>
              {currentTipAmount && (
                <p>
                  <strong>Amount:</strong> {parseFloat(ethers.formatEther(currentTipAmount)).toFixed(6)} ETH
                </p>
              )}
              <p>Transaction Hash:</p>
              <div className={styles.transactionHashSuccess}>
                <a href={getEtherscanUrl(transactionHash)} target="_blank" rel="noopener noreferrer" title={transactionHash} className={styles.transactionLink}>
                  {formatTransactionHash(transactionHash)}
                </a>
                <button className={styles.copyButton} onClick={() => navigator.clipboard.writeText(transactionHash)} title="Copy full transaction hash">
                  📋
                </button>
              </div>
              {confirmations > 0 && (
                <p>
                  <strong>Confirmations:</strong> {confirmations}
                </p>
              )}
              <p>
                Closing in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
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

              {/* Show progress information if transaction is in progress */}
              {getProgressContent()}

              {/* Only show input section if not in progress */}
              {transactionStatus === 'idle' && (
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
                  <p className={styles.amountHint}>
                    {minimumTipAmount ? (
                      <>Minimum: {parseFloat(ethers.formatEther(minimumTipAmount)).toFixed(6)} ETH. If empty, will use the minimum amount.</>
                    ) : (
                      "If empty, will use the contract's minimum tip amount"
                    )}
                  </p>
                </div>
              )}

              {error && (
                <div className={styles.errorMessage}>
                  <p>❌ Error: {error.message}</p>
                </div>
              )}

              <div className={styles.modalActions}>
                {/* Only show cancel/send buttons if not confirmed */}
                {transactionStatus !== 'confirmed' && (
                  <>
                    <button className={styles.cancelButton} onClick={onClose} disabled={isLoading && transactionStatus === 'sending'}>
                      {transactionStatus === 'pending' ? 'Close' : 'Cancel'}
                    </button>
                    {transactionStatus === 'idle' && (
                      <button className={styles.sendButton} onClick={handleSendTip} disabled={isLoading || !canTip}>
                        {isLoading ? 'Sending...' : 'Send Tip'}
                      </button>
                    )}
                  </>
                )}

                {/* Show close button for confirmed transactions */}
                {transactionStatus === 'confirmed' && (
                  <button className={styles.closeButtonLarge} onClick={onClose}>
                    Close
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SendTipModal
