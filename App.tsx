import { useState, useMemo } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { arcTestnet } from './chain'

/** build a minimal ABI with either 0-arg faucet functions or setGreeting(string) */
const makeAbi = (fnName: string) => {
  if (fnName === 'setGreeting') {
    return [
      {
        type: 'function',
        name: 'setGreeting',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'newGreeting', type: 'string' }],
        outputs: [],
      },
    ] as const
  }
  return [
    { type: 'function', name: fnName, stateMutability: 'nonpayable', inputs: [], outputs: [] },
  ] as const
}

function Connect() {
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAccount()

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        style={{ padding: '10px 16px', borderRadius: 12, background: '#000', color: '#fff' }}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ color: '#475569', fontSize: 14 }}>
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        style={{ padding: '8px 12px', borderRadius: 12, background: '#e2e8f0' }}
      >
        Disconnect
      </button>
    </div>
  )
}

export default function App() {
  const { isConnected } = useAccount()

  // default to your HelloArchitect (does NOT have gm())
  const [contract, setContract] = useState('0xf9D1FAb74B24353C3a878B8E299Bbe6d4e100237')

  // choose what to call: “gm” for your faucet contract, or “setGreeting” for HelloArchitect
  const [fn, setFn] = useState<'gm' | 'faucet' | 'drip' | 'claim' | 'setGreeting'>('gm')
  const [arg, setArg] = useState('GM from Arc!') // used only when fn === 'setGreeting'

  const abi = useMemo(() => makeAbi(fn), [fn])

  const { data: hash, isPending, error, writeContract } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash })

  const onClick = () => {
    if (!contract) return
    if (fn === 'setGreeting') {
      writeContract({
        address: contract as `0x${string}`,
        abi,
        functionName: 'setGreeting',
        args: [arg],
        chainId: arcTestnet.id,
      })
    } else {
      writeContract({
        address: contract as `0x${string}`,
        abi,
        functionName: fn,
        chainId: arcTestnet.id,
      })
    }
  }

  const busy = isPending || wait.isLoading

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(#fff,#f8fafc)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>GM ARC Faucet</h1>
          <Connect />
        </header>

        <section
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            marginBottom: 16,
          }}
        >
          <label
            style={{ display: 'block', fontSize: 14, color: '#64748b', marginBottom: 6 }}
          >
            Faucet contract address
          </label>
          <input
            placeholder="0x..."
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
            }}
          />

          <div style={{ height: 8 }} />

          <label
            style={{ display: 'block', fontSize: 14, color: '#64748b', marginBottom: 6 }}
          >
            Function to call
          </label>
          <select
            value={fn}
            onChange={(e) => setFn(e.target.value as any)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
            }}
          >
            <option value="gm">gm()</option>
            <option value="faucet">faucet()</option>
            <option value="drip">drip()</option>
            <option value="claim">claim()</option>
            <option value="setGreeting">setGreeting(string)</option>
          </select>

          {fn === 'setGreeting' && (
            <>
              <div style={{ height: 8 }} />
              <label
                style={{ display: 'block', fontSize: 14, color: '#64748b', marginBottom: 6 }}
              >
                new greeting
              </label>
              <input
                placeholder="Hello…"
                value={arg}
                onChange={(e) => setArg(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                }}
              />
            </>
          )}

          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            Use a faucet contract address when calling gm/faucet/drip/claim.
            Use your HelloArchitect address when calling setGreeting(string).
          </p>
        </section>

        <section
          style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <button
            onClick={onClick}
            disabled={!isConnected || !contract || busy}
            style={{ padding: '10px 16px', borderRadius: 12, background: '#000', color: '#fff' }}
          >
            {busy ? 'Sending...' : fn === 'setGreeting' ? 'Set greeting' : 'GM'}
          </button>

          {hash && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#475569', wordBreak: 'break-all' }}>
              tx: {hash}
            </div>
          )}
          {wait.isSuccess && (
            <div style={{ marginTop: 6, fontSize: 14, color: '#059669' }}>Transaction confirmed</div>
          )}
          {error && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626' }}>
              Error: {String((error as any).shortMessage || (error as any).message)}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
