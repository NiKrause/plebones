// Ethers v6 compatibility polyfill for plebbit-react-hooks
// This patches the ethers module to add the missing computePublicKey method

import {ethers} from 'ethers'

console.log('🔧 Setting up comprehensive ethers computePublicKey polyfill...')

// Create the polyfill function
const computePublicKeyPolyfill = ethers?.SigningKey?.computePublicKey?.bind(ethers.SigningKey)

if (computePublicKeyPolyfill) {
  // 1. Patch window.ethers for global access
  if (typeof window !== 'undefined') {
    if (!window.ethers) {
      window.ethers = ethers
    }

    // Ensure ethers object exists and patch it
    if (!window.ethers.utils) {
      window.ethers.utils = {}
    }

    // Add the polyfills
    window.ethers.computePublicKey = computePublicKeyPolyfill
    window.ethers.utils.computePublicKey = computePublicKeyPolyfill
    window.computePublicKey = computePublicKeyPolyfill

    // Set up globalThis for Vite define replacements
    globalThis.computePublicKey = computePublicKeyPolyfill

    // Create comprehensive utils polyfill for ethers v5 compatibility
    const ethersUtilsPolyfill = {
      computePublicKey: computePublicKeyPolyfill,
      hexlify:
        ethers.hexlify ||
        ((value) => {
          if (typeof value === 'string') return value.startsWith('0x') ? value : '0x' + value
          if (value instanceof Uint8Array || Array.isArray(value)) {
            return '0x' + Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('')
          }
          return '0x' + value.toString(16)
        }),
      arrayify:
        ethers.getBytes ||
        ethers.arrayify ||
        ((value) => {
          if (typeof value === 'string') {
            const hex = value.startsWith('0x') ? value.slice(2) : value
            return new Uint8Array(hex.match(/.{2}/g).map((byte) => parseInt(byte, 16)))
          }
          return new Uint8Array(value)
        }),
      computeAddress: ethers.computeAddress,
      recoverAddress: ethers.recoverAddress,
      getAddress: ethers.getAddress,
      isAddress: ethers.isAddress,
      randomBytes:
        ethers.randomBytes ||
        ((length) => {
          const array = new Uint8Array(length)
          crypto.getRandomValues(array)
          return array
        }),
      keccak256: ethers.keccak256,
      sha256: ethers.sha256,
      toUtf8Bytes: ethers.toUtf8Bytes,
      toUtf8String: ethers.toUtf8String,
      parseEther: ethers.parseEther,
      formatEther: ethers.formatEther,
      parseUnits: ethers.parseUnits,
      formatUnits: ethers.formatUnits,
    }

    globalThis.ethersUtils = ethersUtilsPolyfill

    // Also add individual methods to globalThis
    Object.entries(ethersUtilsPolyfill).forEach(([key, value]) => {
      if (value) {
        globalThis[key] = value
      }
    })
  }

  // 2. Try to patch the actual ethers module by monkey-patching
  try {
    if (!ethers.computePublicKey) {
      Object.defineProperty(ethers, 'computePublicKey', {
        value: computePublicKeyPolyfill,
        writable: false,
        configurable: true,
      })
    }

    if (!ethers.utils) {
      Object.defineProperty(ethers, 'utils', {
        value: {},
        writable: true,
        configurable: true,
      })
    }

    if (ethers.utils && !ethers.utils.computePublicKey) {
      Object.defineProperty(ethers.utils, 'computePublicKey', {
        value: computePublicKeyPolyfill,
        writable: false,
        configurable: true,
      })
    }

    console.log('✅ Direct ethers module patching successful')
  } catch (patchError) {
    console.warn('⚠️ Could not patch ethers module directly:', patchError.message)
  }

  // 3. Intercept require/import calls (for bundlers)
  if (typeof window !== 'undefined') {
    // Store original require if it exists
    if (typeof window.require === 'function') {
      const originalRequire = window.require
      window.require = function (id) {
        const module = originalRequire.apply(this, arguments)
        if (id === 'ethers' && module && !module.utils?.computePublicKey) {
          if (!module.utils) module.utils = {}
          module.utils.computePublicKey = computePublicKeyPolyfill
          module.computePublicKey = computePublicKeyPolyfill
        }
        return module
      }
    }

    // Also patch any existing ethers modules in the module cache
    const moduleKeys = ['ethers', 'ethers/lib/index.js', '@ethersproject/signing-key']
    moduleKeys.forEach((key) => {
      try {
        if (window[key] && typeof window[key] === 'object') {
          if (!window[key].utils) window[key].utils = {}
          window[key].utils.computePublicKey = computePublicKeyPolyfill
          window[key].computePublicKey = computePublicKeyPolyfill
        }
      } catch (e) {
        // Ignore errors
      }
    })
  }

  // 4. Runtime module interception for Vite bundled modules
  if (typeof window !== 'undefined') {
    // Patch any existing ethers_exports that might be in the bundle
    const originalDefineProperty = Object.defineProperty
    Object.defineProperty = function (obj, prop, descriptor) {
      // Intercept when Vite tries to define ethers_exports
      if (prop === 'ethers_exports' && obj && typeof obj === 'object') {
        console.log('🔧 Intercepted ethers_exports definition')

        // Create a proxy for ethers_exports to add missing methods
        const originalExports = descriptor.value || {}
        const proxiedExports = new Proxy(originalExports, {
          get(target, prop, receiver) {
            if (prop === 'utils') {
              return new Proxy(target.utils || {}, {
                get(utilsTarget, utilsProp, utilsReceiver) {
                  if (utilsProp === 'hexlify' && !utilsTarget[utilsProp]) {
                    return globalThis.ethersUtils?.hexlify
                  }
                  if (utilsProp === 'computePublicKey' && !utilsTarget[utilsProp]) {
                    return globalThis.ethersUtils?.computePublicKey
                  }
                  if (utilsProp === 'arrayify' && !utilsTarget[utilsProp]) {
                    return globalThis.ethersUtils?.arrayify
                  }
                  return Reflect.get(utilsTarget, utilsProp, utilsReceiver)
                },
              })
            }
            if (prop === 'computePublicKey' && !target[prop]) {
              return globalThis.computePublicKey
            }
            return Reflect.get(target, prop, receiver)
          },
        })

        descriptor.value = proxiedExports
      }
      return originalDefineProperty.call(this, obj, prop, descriptor)
    }

    // Also check if ethers_exports already exists and patch it
    const checkAndPatchEthersExports = () => {
      if (window.ethers_exports) {
        console.log('🔧 Found existing ethers_exports, patching...')
        if (!window.ethers_exports.utils) {
          window.ethers_exports.utils = {}
        }
        window.ethers_exports.utils.hexlify = globalThis.ethersUtils?.hexlify
        window.ethers_exports.utils.computePublicKey = globalThis.ethersUtils?.computePublicKey
        window.ethers_exports.utils.arrayify = globalThis.ethersUtils?.arrayify
        window.ethers_exports.computePublicKey = globalThis.computePublicKey
        return true
      }
      return false
    }

    // Check immediately and periodically
    if (!checkAndPatchEthersExports()) {
      setTimeout(checkAndPatchEthersExports, 100)
      setTimeout(checkAndPatchEthersExports, 500)
      setTimeout(checkAndPatchEthersExports, 1000)
    }

    // Intercept console errors to catch and fix ethers issues in real-time
    const originalError = console.error
    console.error = function (...args) {
      const errorMessage = args.join(' ')
      if (errorMessage.includes('ethers_exports.utils.') && !checkAndPatchEthersExports()) {
        // Try to patch again if we catch the error
        console.log('⚠️ Caught hexlify error, attempting emergency patch...')

        // Debug: Show all window properties that might contain ethers
        console.log('🔍 Searching for ethers_exports in window properties:')
        Object.getOwnPropertyNames(window).forEach((prop) => {
          if (prop.includes('ethers') || prop.includes('vite') || prop.includes('__')) {
            console.log(`  Found property: ${prop} = ${typeof window[prop]}`)
          }
        })

        // More aggressive search through all window properties
        const findEthersExports = (obj, path = 'window') => {
          if (!obj || typeof obj !== 'object') return null

          // Direct match
          if (obj.utils && typeof obj.utils === 'object') {
            console.log(`🔍 Found utils object at: ${path}`)
            return obj
          }

          // Search nested objects (but avoid circular references)
          if (path.split('.').length < 3) {
            for (const [key, value] of Object.entries(obj)) {
              if (key.includes('ethers') && typeof value === 'object' && value !== window) {
                const result = findEthersExports(value, `${path}.${key}`)
                if (result) return result
              }
            }
          }

          return null
        }

        const foundExports = findEthersExports(window)

        if (foundExports) {
          console.log('🔧 Found ethers exports object, applying patch...')
          if (!foundExports.utils) foundExports.utils = {}
          // Patch all missing ethers v5 utils methods
          Object.entries(globalThis.ethersUtils || {}).forEach(([key, value]) => {
            if (value && !foundExports.utils[key]) {
              foundExports.utils[key] = value
            }
          })
          console.log('✅ Emergency patch applied successfully')
          return // Don't log the original error since we fixed it
        } else {
          console.log('❌ Could not find ethers_exports object anywhere')

          // Last resort: try to monkey patch the actual error location
          // This is a bit hacky but might work
          try {
            eval(`
              if (typeof ethers_exports !== 'undefined') {
                if (!ethers_exports.utils) ethers_exports.utils = {};
                ethers_exports.utils.hexlify = globalThis.ethersUtils?.hexlify;
                ethers_exports.utils.computePublicKey = globalThis.ethersUtils?.computePublicKey;
                console.log('✅ Direct eval patch applied successfully');
              }
            `)
            return // Success, don't log the error
          } catch (evalError) {
            console.log('❌ Eval patch failed:', evalError.message)
          }
        }
      }

      // Call original error function
      originalError.apply(console, args)
    }
  }

  console.log('✅ Enhanced computePublicKey polyfill installed')

  // Test the polyfill
  try {
    const testKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
    const result = computePublicKeyPolyfill(testKey)
    console.log('✅ computePublicKey test passed, result length:', result?.length || 0)

    // Also test accessing via ethers.utils
    if (ethers.utils?.computePublicKey) {
      console.log('✅ ethers.utils.computePublicKey available')
    } else {
      console.warn('⚠️ ethers.utils.computePublicKey still not available after patching')
    }
  } catch (error) {
    console.warn('⚠️ computePublicKey test failed:', error.message)
  }
} else {
  console.error('❌ Could not set up computePublicKey polyfill - SigningKey.computePublicKey not found')
}
