import {useState} from 'react'
import SendTipModal from './send-tip-modal'
import styles from './send-tip.module.css'

const TipButton = ({comment, subplebbit}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  // Don't show tip button if no recipient wallet
  if (!comment?.author?.wallets?.eth?.address) {
    return null
  }

  return (
    <>
      <button className={styles.tipButton} onClick={handleOpenModal} title="Send tip">
        💰 Tip
      </button>

      {isModalOpen && <SendTipModal comment={comment} subplebbit={subplebbit} onClose={handleCloseModal} />}
    </>
  )
}

export default TipButton
