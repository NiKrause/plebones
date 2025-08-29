// Temporary mock implementation for PlebbitTippingV1
// This will be replaced with the actual package once it's properly installed

export const PlebbitTippingV1 = async ({rpcUrls, cache}) => {
  console.log('Mock PlebbitTippingV1 initialized with:', {rpcUrls, cache})

  return {
    async createTip({feeRecipients, recipientCommentCid, senderCommentCid, sender, privateKey}) {
      console.log('Mock createTip called with:', {
        feeRecipients,
        recipientCommentCid,
        senderCommentCid,
        sender,
        privateKey: privateKey ? '[REDACTED]' : undefined,
      })

      return {
        async send() {
          // Simulate a delay
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Simulate success
          const mockTransactionHash = '0x' + Math.random().toString(16).substr(2, 64)
          const mockReceipt = {
            blockNumber: Math.floor(Math.random() * 1000000),
            gasUsed: '21000',
            status: 1,
          }

          return {
            transactionHash: mockTransactionHash,
            receipt: mockReceipt,
            error: undefined,
          }
        },
      }
    },

    async createComment({feeRecipients, recipientCommentCid}) {
      console.log('Mock createComment called with:', {
        feeRecipients,
        recipientCommentCid,
      })

      return {
        tipsTotalAmount: BigInt(Math.floor(Math.random() * 1000000000000000000)), // Random amount in wei
        async updateTipsTotalAmount() {
          // Simulate fetching from blockchain
          await new Promise((resolve) => setTimeout(resolve, 1000))
          this.tipsTotalAmount = BigInt(Math.floor(Math.random() * 1000000000000000000))
        },
      }
    },

    async createSenderComment({feeRecipients, recipientCommentCid, senderCommentCid, sender}) {
      console.log('Mock createSenderComment called with:', {
        feeRecipients,
        recipientCommentCid,
        senderCommentCid,
        sender,
      })

      return {
        tipsTotalAmount: BigInt(Math.floor(Math.random() * 1000000000000000000)), // Random amount in wei
        async updateTipsTotalAmount() {
          // Simulate fetching from blockchain
          await new Promise((resolve) => setTimeout(resolve, 1000))
          this.tipsTotalAmount = BigInt(Math.floor(Math.random() * 1000000000000000000))
        },
      }
    },

    async getFeePercent() {
      return BigInt(5) // 5%
    },

    async getMinimumTipAmount() {
      return BigInt('1000000000000000') // 0.001 ETH in wei
    },
  }
}
