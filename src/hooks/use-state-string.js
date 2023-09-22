import {useMemo} from 'react'
import {useClientsStates} from '@plebbit/plebbit-react-hooks'

const clientHosts = {}
const getClientHost = (clientUrl) => {
  if (!clientHosts[clientUrl]) {
    try {
      clientHosts[clientUrl] = new URL(clientUrl).hostname || clientUrl
    } catch (e) {
      clientHosts[clientUrl] = clientUrl
    }
  }
  return clientHosts[clientUrl]
}

const useStateString = (commentOrSubplebbit) => {
  const {states} = useClientsStates({comment: commentOrSubplebbit})
  return useMemo(() => {
    let stateString = ''
    for (const state in states) {
      const clientUrls = states[state]
      const clientHosts = clientUrls.map((clientUrl) => getClientHost(clientUrl))

      // if there are no valid hosts, skip this state
      if (clientHosts.length === 0) {
        continue
      }

      // separate 2 different states using ' '
      if (stateString) {
        stateString += ', '
      }

      // e.g. 'cloudflare-ipfs.com/ipfs.io: fetching-ipfs'
      stateString += `${clientHosts.join('/')}: ${state}`
    }

    // fallback to comment or subplebbit state when possible
    if (!stateString) {
      if (commentOrSubplebbit?.publishingState && commentOrSubplebbit?.publishingState !== 'stopped' && commentOrSubplebbit?.publishingState !== 'succeeded') {
        stateString = commentOrSubplebbit.publishingState
      } else if (commentOrSubplebbit?.updatingState !== 'stopped' && commentOrSubplebbit?.updatingState !== 'succeeded') {
        stateString = commentOrSubplebbit.updatingState
      }
    }

    if (stateString) {
      stateString += '...'
    }

    // if string is empty, return undefined instead
    return stateString === '' ? undefined : stateString
  }, [states, commentOrSubplebbit])
}

export default useStateString
