import {useState, useEffect, useMemo, useCallback} from 'react'
import {PlebbitTippingV1} from 'plebbit-tipping-v1'

// Default RPC URLs - using Sepolia testnet for now
const DEFAULT_RPC_URLS = [
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org', // Free public RPC
  import.meta.env.VITE_SEPOLIA_BACKUP_RPC_URL || 'https://sepolia.drpc.org', // Backup public RPC
  'https://ethereum-sepolia-rpc.publicnode.com', // Another backup
]
const CACHE_CONFIG = {maxAge: 60000}

let plebbitTippingInstance = null

// Initialize the tipping instance once
const initializeTippingInstance = async () => {
  if (!plebbitTippingInstance) {
    plebbitTippingInstance = await PlebbitTippingV1({
      rpcUrls: DEFAULT_RPC_URLS,
      cache: CACHE_CONFIG,
    })
  }
  return plebbitTippingInstance
}

const useTipsAmount = ({comment, subplebbit}) => {
  const [tipsAmount, setTipsAmount] = useState(0n) // Use BigInt for precision
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Get fee recipients from comment or subplebbit tipping config
  const feeRecipients = useMemo(() => {
    // Priority: comment.tipping.eth.feeRecipientAddress > subplebbit.tipping.eth.feeRecipientAddress > default
    const commentFeeRecipient = comment?.tipping?.eth?.feeRecipientAddress
    const subplebbitFeeRecipient = subplebbit?.tipping?.eth?.feeRecipientAddress

    if (commentFeeRecipient) {
      return [commentFeeRecipient]
    }
    if (subplebbitFeeRecipient) {
      return [subplebbitFeeRecipient]
    }

    // Default fee recipient (could be a community fund or similar)
    return ['0x7CC17990FE944919Aa6b91AA576CEBf1E9454749']
  }, [comment, subplebbit])

  // Function to fetch tips amount
  const fetchTipsAmount = useCallback(async () => {
    if (!comment?.cid) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tippingInstance = await initializeTippingInstance()

      // Create comment instance to get tips total amount
      const commentInstance = await tippingInstance.createComment({
        feeRecipients,
        recipientCommentCid: comment.cid,
      })

      setTipsAmount(commentInstance.tipsTotalAmount)
      setLastUpdated(Date.now())
    } catch (error) {
      console.error('Failed to fetch tips amount:', error)
      setError(error)
      setTipsAmount(0n)
    } finally {
      setIsLoading(false)
    }
  }, [comment?.cid, feeRecipients])

  // Function to refresh tips amount (bypasses cache)
  const refreshTipsAmount = useCallback(async () => {
    if (!comment?.cid) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tippingInstance = await initializeTippingInstance()

      // Create comment instance
      const commentInstance = await tippingInstance.createComment({
        feeRecipients,
        recipientCommentCid: comment.cid,
      })

      // Force refresh from blockchain
      await commentInstance.updateTipsTotalAmount()

      setTipsAmount(commentInstance.tipsTotalAmount)
      setLastUpdated(Date.now())
    } catch (error) {
      console.error('Failed to refresh tips amount:', error)
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [comment?.cid, feeRecipients])

  // Initial fetch when comment or fee recipients change
  useEffect(() => {
    fetchTipsAmount()
  }, [fetchTipsAmount])

  // Auto-refresh every 60 seconds while component is mounted
  useEffect(() => {
    if (!comment?.cid) {
      return
    }

    const intervalId = setInterval(() => {
      refreshTipsAmount()
    }, 60000) // Refresh every 60 seconds

    return () => clearInterval(intervalId)
  }, [comment?.cid, refreshTipsAmount])

  // Convert BigInt to ETH string for display
  const tipsAmountEth = useMemo(() => {
    if (tipsAmount === 0n) {
      return '0'
    }

    try {
      // Convert wei to ETH (divide by 10^18)
      const ethValue = Number(tipsAmount) / Math.pow(10, 18)

      // Format to a reasonable number of decimal places
      if (ethValue < 0.001) {
        return ethValue.toExponential(3)
      } else if (ethValue < 1) {
        return ethValue.toFixed(6).replace(/\.?0+$/, '')
      } else {
        return ethValue.toFixed(4).replace(/\.?0+$/, '')
      }
    } catch (error) {
      console.error('Error converting tips amount:', error)
      return '0'
    }
  }, [tipsAmount])

  return {
    tipsAmount, // BigInt value in wei
    tipsAmountEth, // String value in ETH for display
    isLoading,
    error,
    lastUpdated,
    refreshTipsAmount,
    feeRecipients,
  }
}

export default useTipsAmount
