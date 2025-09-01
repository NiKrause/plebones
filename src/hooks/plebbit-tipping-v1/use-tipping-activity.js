import {useState, useEffect, useCallback, useMemo} from 'react'
import {PlebbitTippingV1} from 'plebbit-tipping-v1'
import {ethers} from 'ethers'

// Default RPC URLs - using Sepolia testnet
const DEFAULT_RPC_URLS = [
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  import.meta.env.VITE_SEPOLIA_BACKUP_RPC_URL || 'https://sepolia.drpc.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
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

const useTippingActivity = ({walletAddress}) => {
  const [tippingActivity, setTippingActivity] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Function to fetch tipping activity using the js-api
  const fetchTippingActivity = useCallback(async () => {
    if (!walletAddress) {
      setTippingActivity([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const tippingInstance = await initializeTippingInstance()

      // Use the new getTipsActivity method from the enhanced js-api
      const activity = await tippingInstance.getTipsActivity(walletAddress, {
        limit: 50, // Get last 50 transactions
      })

      console.log(`Found ${activity.length} tipping activities for ${walletAddress}`)

      setTippingActivity(activity)
      setLastUpdated(Date.now())
    } catch (error) {
      console.error('Failed to fetch tipping activity:', error)
      setError(error)
      setTippingActivity([])
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  // Initial fetch when wallet address changes
  useEffect(() => {
    fetchTippingActivity()
  }, [fetchTippingActivity])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!walletAddress) return

    const intervalId = setInterval(fetchTippingActivity, 60000)
    return () => clearInterval(intervalId)
  }, [walletAddress, fetchTippingActivity])

  // Computed values for display
  const totalSent = useMemo(() => {
    return tippingActivity.filter((tip) => tip.type === 'sent').reduce((sum, tip) => sum + tip.amount, 0n)
  }, [tippingActivity])

  const totalReceived = useMemo(() => {
    return tippingActivity.filter((tip) => tip.type === 'received').reduce((sum, tip) => sum + tip.amount, 0n)
  }, [tippingActivity])

  const sentCount = useMemo(() => {
    return tippingActivity.filter((tip) => tip.type === 'sent').length
  }, [tippingActivity])

  const receivedCount = useMemo(() => {
    return tippingActivity.filter((tip) => tip.type === 'received').length
  }, [tippingActivity])

  return {
    tippingActivity,
    isLoading,
    error,
    lastUpdated,
    refreshActivity: fetchTippingActivity,
    totalSent,
    totalReceived,
    sentCount,
    receivedCount,
  }
}

export default useTippingActivity
