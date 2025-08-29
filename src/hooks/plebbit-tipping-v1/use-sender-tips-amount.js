import {useState, useEffect, useMemo, useCallback} from 'react'
import {PlebbitTippingV1} from 'plebbit-tipping-v1'
import {useAccount} from '@plebbit/plebbit-react-hooks'

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

const useSenderTipsAmount = ({comment, subplebbit}) => {
  const [senderTipsAmount, setSenderTipsAmount] = useState(0n) // Use BigInt for precision
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const account = useAccount()

  // Get sender address from account
  const senderAddress = useMemo(() => {
    return account?.author?.wallets?.eth?.address
  }, [account])

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

  // Function to fetch sender tips amount
  const fetchSenderTipsAmount = useCallback(async () => {
    if (!comment?.cid || !senderAddress) {
      setSenderTipsAmount(0n)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tippingInstance = await initializeTippingInstance()

      // Create sender comment instance to get tips total amount
      const senderCommentInstance = await tippingInstance.createSenderComment({
        feeRecipients,
        recipientCommentCid: comment.cid,
        senderCommentCid: undefined, // Could be added later if we track sender comments
        sender: senderAddress,
      })

      setSenderTipsAmount(senderCommentInstance.tipsTotalAmount)
      setLastUpdated(Date.now())
    } catch (error) {
      console.error('Failed to fetch sender tips amount:', error)
      setError(error)
      setSenderTipsAmount(0n)
    } finally {
      setIsLoading(false)
    }
  }, [comment?.cid, senderAddress, feeRecipients])

  // Function to refresh sender tips amount (bypasses cache)
  const refreshSenderTipsAmount = useCallback(async () => {
    if (!comment?.cid || !senderAddress) {
      setSenderTipsAmount(0n)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tippingInstance = await initializeTippingInstance()

      // Create sender comment instance
      const senderCommentInstance = await tippingInstance.createSenderComment({
        feeRecipients,
        recipientCommentCid: comment.cid,
        senderCommentCid: undefined, // Could be added later if we track sender comments
        sender: senderAddress,
      })

      // Force refresh from blockchain
      await senderCommentInstance.updateTipsTotalAmount()

      setSenderTipsAmount(senderCommentInstance.tipsTotalAmount)
      setLastUpdated(Date.now())
    } catch (error) {
      console.error('Failed to refresh sender tips amount:', error)
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [comment?.cid, senderAddress, feeRecipients])

  // Initial fetch when comment, sender, or fee recipients change
  useEffect(() => {
    fetchSenderTipsAmount()
  }, [fetchSenderTipsAmount])

  // Auto-refresh every 60 seconds while component is mounted
  useEffect(() => {
    if (!comment?.cid || !senderAddress) {
      return
    }

    const intervalId = setInterval(() => {
      refreshSenderTipsAmount()
    }, 60000) // Refresh every 60 seconds

    return () => clearInterval(intervalId)
  }, [comment?.cid, senderAddress, refreshSenderTipsAmount])

  // Convert BigInt to ETH string for display
  const senderTipsAmountEth = useMemo(() => {
    if (senderTipsAmount === 0n) {
      return '0'
    }

    try {
      // Convert wei to ETH (divide by 10^18)
      const ethValue = Number(senderTipsAmount) / Math.pow(10, 18)

      // Format to a reasonable number of decimal places
      if (ethValue < 0.001) {
        return ethValue.toExponential(3)
      } else if (ethValue < 1) {
        return ethValue.toFixed(6).replace(/\.?0+$/, '')
      } else {
        return ethValue.toFixed(4).replace(/\.?0+$/, '')
      }
    } catch (error) {
      console.error('Error converting sender tips amount:', error)
      return '0'
    }
  }, [senderTipsAmount])

  return {
    senderTipsAmount, // BigInt value in wei
    senderTipsAmountEth, // String value in ETH for display
    isLoading,
    error,
    lastUpdated,
    refreshSenderTipsAmount,
    senderAddress,
    feeRecipients,
  }
}

export default useSenderTipsAmount
