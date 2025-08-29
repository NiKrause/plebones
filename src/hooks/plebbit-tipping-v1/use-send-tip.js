import {useState, useCallback, useMemo} from 'react'
import {PlebbitTippingV1} from 'plebbit-tipping-v1'
import {useAccount} from '@plebbit/plebbit-react-hooks'

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
  // Function to send a tip
  const sendTip = useCallback(
    async (tipAmount = null) => {
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

      try {
        const tippingInstance = await initializeTippingInstance()

        // Create tip transaction with private key
        const tipTransaction = await tippingInstance.createTip({
          feeRecipients,
          recipientCommentCid: comment.cid,
          senderCommentCid: undefined, // Could be added later if needed
          sender: account.author.wallets.eth.address,
          privateKey: hexPrivateKey,
        })

        console.log('Tip transaction created, sending...')

        // Send the transaction
        const result = await tipTransaction.send()

        if (result.error) {
          throw result.error
        }

        setTip({
          transactionHash: result.transactionHash,
          receipt: result.receipt,
          recipientWallet,
          feeRecipients,
          timestamp: Date.now(),
        })

        console.log('Tip sent successfully:', result.transactionHash)
      } catch (error) {
        console.error('Failed to send tip:', error)
        setError(error)
      } finally {
        setIsLoading(false)
      }
    },
    [canTip, comment, recipientWallet, account, feeRecipients]
  )

  return {
    sendTip,
    tip,
    isLoading,
    error,
    canTip,
    recipientWallet,
    feeRecipients,
  }
}

export default useSendTip
