import {useState, useCallback, useMemo, useEffect} from 'react'
import {PlebbitTippingV1} from 'plebbit-tipping-v1'
import {useAccount} from '@plebbit/plebbit-react-hooks'
import {ethers} from 'ethers'

// Convert base64 private key to hex format for ethers
const convertPrivateKeyToHex = (base64PrivateKey) => {
  if (!base64PrivateKey) return null
  if (base64PrivateKey.startsWith('0x')) return base64PrivateKey

  try {
    const buffer = Buffer.from(base64PrivateKey, 'base64')
    return '0x' + buffer.toString('hex')
  } catch (error) {
    console.error('Failed to convert private key:', error)
    return null
  }
} // Default RPC URLs - configurable via environment variables
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

const useSendTip = ({comment, subplebbit}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tip, setTip] = useState(null) // Will store the last tip transaction result
  const [transactionHash, setTransactionHash] = useState(null) // Transaction hash available immediately
  const [transactionStatus, setTransactionStatus] = useState('idle') // 'idle', 'sending', 'pending', 'confirmed', 'failed'
  const [currentBlock, setCurrentBlock] = useState(null)
  const [confirmations, setConfirmations] = useState(0)
  const [currentTipAmount, setCurrentTipAmount] = useState(null) // Track the current tip amount being sent
  const [minimumTipAmount, setMinimumTipAmount] = useState(null) // Track the contract's minimum tip amount
  const account = useAccount()

  // Get the recipient wallet address from comment.author.wallets
  const recipientWallet = useMemo(() => {
    if (!comment?.author?.wallets?.eth?.address) {
      return null
    }
    return comment.author.wallets.eth.address
  }, [comment])

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

  // Check if tipping is possible (excluding private key since we will ask for it)
  const canTip = useMemo(() => {
    console.log('Debug - Signer private key:', account?.signer?.privateKey)
    console.log('Debug - Full wallet structure:', account?.author?.wallets?.eth)
    console.log('Debug - Account keys:', Object.keys(account || {}))

    return !!(comment?.cid && recipientWallet && account?.author?.wallets?.eth?.address)
  }, [comment, recipientWallet, account])
  // Function to get current block number
  const getCurrentBlock = useCallback(async () => {
    try {
      const tippingInstance = await initializeTippingInstance()
      // Access the provider from the tipping instance
      if (tippingInstance.provider) {
        const blockNumber = await tippingInstance.provider.getBlockNumber()
        setCurrentBlock(blockNumber)
        return blockNumber
      }
    } catch (error) {
      console.error('Failed to get current block:', error)
    }
    return null
  }, [])

  // Function to get the minimum tip amount using the js-api method
  const getMinimumTipAmount = useCallback(async () => {
    try {
      const tippingInstance = await initializeTippingInstance()
      const minTipAmount = await tippingInstance.getMinimumTipAmount()
      setMinimumTipAmount(minTipAmount)
      return minTipAmount
    } catch (error) {
      console.error('Failed to get minimum tip amount:', error)
    }
    return null
  }, [])

  // Function to get the default tip amount (minimum) using js-api method
  const getDefaultTipAmount = useCallback(async () => {
    try {
      const tippingInstance = await initializeTippingInstance()
      const minTipAmount = await tippingInstance.getMinimumTipAmount()
      // Use minimum amount as default (no multiplication)
      const defaultAmount = minTipAmount
      // Also store the minimum amount for display
      setMinimumTipAmount(minTipAmount)
      return defaultAmount
    } catch (error) {
      console.error('Failed to get default tip amount:', error)
    }
    return null
  }, [])

  // Function to monitor transaction confirmations
  const monitorTransaction = useCallback(async (hash) => {
    if (!hash) return

    try {
      const tippingInstance = await initializeTippingInstance()
      if (tippingInstance.provider) {
        // Get transaction receipt to check if it's confirmed
        const receipt = await tippingInstance.provider.getTransactionReceipt(hash)

        if (receipt) {
          setTransactionStatus('confirmed')
          const currentBlock = await tippingInstance.provider.getBlockNumber()
          const confirmationCount = currentBlock - receipt.blockNumber + 1
          setConfirmations(confirmationCount)
          setCurrentBlock(currentBlock)
        } else {
          // Transaction is still pending
          const currentBlock = await tippingInstance.provider.getBlockNumber()
          setCurrentBlock(currentBlock)
        }
      }
    } catch (error) {
      console.error('Failed to monitor transaction:', error)
    }
  }, [])

  // Function to send a tip
  const sendTip = useCallback(
    async (tipAmount = null) => {
      console.log('sendTip called with tipAmount:', tipAmount, 'type:', typeof tipAmount)

      // Parse and validate custom tip amount
      let customAmount = null
      if (tipAmount && tipAmount.trim() !== '') {
        try {
          const amountInEth = parseFloat(tipAmount)
          if (isNaN(amountInEth) || amountInEth <= 0) {
            setError(new Error('Please enter a valid tip amount greater than 0'))
            return
          }
          // Convert ETH to wei using ethers v6
          customAmount = ethers.parseEther(amountInEth.toString())
          console.log('Parsed custom tip amount:', ethers.formatEther(customAmount), 'ETH')
          // Store the custom amount for display
          setCurrentTipAmount(customAmount)
        } catch (parseError) {
          setError(new Error('Invalid tip amount format'))
          return
        }
      } else {
        // If no custom amount, get and store the default amount
        try {
          const defaultAmount = await getDefaultTipAmount()
          setCurrentTipAmount(defaultAmount)
        } catch (error) {
          console.error('Failed to get default tip amount:', error)
          setCurrentTipAmount(null)
        }
      }
      if (!canTip) {
        const errorMsg = !comment?.cid
          ? 'Comment CID is required'
          : !recipientWallet
            ? 'Recipient wallet address not found'
            : !account?.author?.wallets?.eth?.address
              ? 'Your wallet address not found'
              : 'Missing required data for tipping'

        setError(new Error(errorMsg))
        return
      }

      const hexPrivateKey = convertPrivateKeyToHex(account?.signer?.privateKey)

      if (!hexPrivateKey) {
        setError(new Error('Private key is required to send tips'))
        return
      }

      setIsLoading(true)
      setError(null)
      setTransactionStatus('sending')
      setTransactionHash(null)
      setConfirmations(0)

      // Get initial block number
      await getCurrentBlock()

      try {
        const tippingInstance = await initializeTippingInstance()

        // Create tip transaction with private key
        const tipTransaction = await tippingInstance.createTip({
          feeRecipients,
          recipientCommentCid: comment.cid,
          senderCommentCid: undefined, // Could be added later if needed
          sender: account.author.wallets.eth.address,
          privateKey: hexPrivateKey,
          tipAmount: customAmount, // Pass the custom tip amount (null for default)
        })

        console.log('Tip transaction created, sending...')
        setTransactionStatus('sending')

        // Send the transaction
        const result = await tipTransaction.send()

        if (result.error) {
          throw result.error
        }

        // Set transaction hash immediately when available
        console.log('Tip sent successfully:', result.transactionHash)
        setTransactionHash(result.transactionHash)
        setTransactionStatus('pending')
        setIsLoading(false) // Transaction is sent, no longer loading

        setTip({
          transactionHash: result.transactionHash,
          receipt: result.receipt,
          recipientWallet,
          feeRecipients,
          timestamp: Date.now(),
        })

        // Start monitoring the transaction
        monitorTransaction(result.transactionHash)
      } catch (error) {
        console.error('Failed to send tip:', error)
        setError(error)
        setTransactionStatus('failed')
      } finally {
        setIsLoading(false)
      }
    },
    [canTip, comment, recipientWallet, account, feeRecipients, getCurrentBlock, monitorTransaction, getDefaultTipAmount]
  )

  // Effect to periodically check transaction status and current block
  useEffect(() => {
    let intervalId

    if (transactionHash && transactionStatus === 'pending') {
      // Poll every 5 seconds while transaction is pending
      intervalId = setInterval(() => {
        monitorTransaction(transactionHash)
      }, 5000)

      // Initial check
      monitorTransaction(transactionHash)
    } else if (transactionStatus === 'confirmed' && currentBlock) {
      // Poll every 15 seconds to update current block for confirmed transactions
      intervalId = setInterval(() => {
        getCurrentBlock()
      }, 15000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [transactionHash, transactionStatus, monitorTransaction, getCurrentBlock, currentBlock])

  return {
    sendTip,
    tip,
    isLoading,
    error,
    canTip,
    recipientWallet,
    feeRecipients,
    transactionHash,
    transactionStatus,
    currentBlock,
    confirmations,
    getCurrentBlock,
    currentTipAmount,
    minimumTipAmount,
    getMinimumTipAmount,
  }
}

export default useSendTip
