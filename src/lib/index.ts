import config from './config.json'
import contract from './contracts/default'

const TESTNET = 'TESTNET'
const MAINNET = 'MAINNET'
const LOCALNET = 'LOCALNET'

export const getApiUrl = (network: Network, withScheme?: boolean) => {
  const { host, port, scheme } = config[network]

  const url = host + (port !== 0 ? `:${port}` : '')

  return withScheme ? `${scheme}://${url}` : url
}

export const nets: Network[] = [TESTNET, MAINNET, LOCALNET]

export const getNetName = (net: string) => {
  switch (net) {
    case TESTNET:
      return 'Test net'
    case MAINNET:
      return 'Main net'
    case LOCALNET:
      return 'Local net'
    default:
      return ''
  }
}

export const restoreContract = (code: string) => {
  try {
    let contractCode = code.replace(
      /_IOSTInstruction_counter.incr\([0-9]*.?[0-9]+\)[;,]/g,
      ''
    )

    contractCode = contractCode.replace(/_IOSTTemplateTag/g, '')
    contractCode = contractCode.replace(/_IOSTSpreadElement\(([^(,]*)\)/g, '$1')

    let attempts = 0 // avoid infinite loop
    while (contractCode.includes('_IOSTBinaryOp')) {
      if (attempts > 100) {
        contractCode = contractCode.replace(
          /_IOSTBinaryOp\((.*),{1} (.*),{1} '(.*)'\)\./g,
          '($1 $3 $2).'
        )

        contractCode = contractCode.replace(
          /_IOSTBinaryOp\((.*),{1} (.*),{1} '(.*)'\)/g,
          '($1 $3 $2)'
        )

        if (attempts > 200) {
          throw new Error('Exceeded max attempt times')
        }
      }

      contractCode = contractCode.replace(
        /_IOSTBinaryOp\(([^(,]*),{1} ([^(,]*),{1} '([^(,]*)'\)/g,
        '$1 $3 $2'
      )
      console.log(contractCode)
      attempts++
    }
    return contractCode
  } catch (e) {
    throw new Error(e)
  }
}
