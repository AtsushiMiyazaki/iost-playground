import React, { useState, useEffect } from 'react'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Typography from '@material-ui/core/Typography'
import Box from '@material-ui/core/Box'
import ContractTab from '../ContractTab'
import useStyles from './styles'
import { Button } from '@material-ui/core'
import NewContractModal from '../NewContractModal'
import defaultContract from '../../lib/contracts/default'
import ApiHostSelect from '../ApiHostSelect'
import { Host } from '../../types/types'
import { getApiUrl, nets, getNetName } from '../../lib'
import axios, { AxiosResponse } from 'axios'

interface TabPanelProps {
  children?: React.ReactNode
  index: any
  value: any
}

type ContractResponse = IOSTJS.Response.Contract

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3} style={{ paddingTop: 0, paddingBottom: 0 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

const a11yProps = (index: any) => {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`
  }
}

const ContractTabs = () => {
  const classes = useStyles()
  const [value, setValue] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [fileList, setFileList] = useState<string[]>([])
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customHost, setCustomHost] = useState('')
  const [host, setHost] = useState('http://13.52.105.102:30001')

  useEffect(() => {
    const fileListStr = window.localStorage.getItem('iost_playground_files')

    if (fileListStr == null) {
      return setFileList(['helloWorld.js'])
    }

    const fileList = JSON.parse(fileListStr) as string[]
    setFileList(fileList)
  }, [])

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue)
  }

  const handleShowModal = () => {
    setShowDialog(!showDialog)
  }

  const createNewContract = (fileName: string) => {
    const e = fileName.split('.')
    const extension = e[e.length - 1]
    const fileNameWithExtension =
      extension === 'js' ? fileName : `${fileName}.js`

    if (fileList.includes(fileNameWithExtension)) {
      return alert('File with the same name already exists')
    }

    window.localStorage.setItem(
      `iost_playground_${fileNameWithExtension}`,
      defaultContract
    )

    updateFileList(fileNameWithExtension)
    setShowDialog(false)
  }

  const updateFileList = (fileNameWithExtension: string) => {
    const newFileList = [...fileList, fileNameWithExtension]

    window.localStorage.setItem(
      'iost_playground_files',
      JSON.stringify(newFileList)
    )
    setFileList(newFileList)
  }

  const importContract = async (contractId: string) => {
    const res: AxiosResponse<ContractResponse> | void = await axios
      .get(`${host}/getContract/${contractId}/true`)
      .catch(e => {
        console.log(
          'Request to %s failed',
          `${host}/getContract/${contractId}/true`
        )
        console.error(e)
      })

    if (res == null) {
      return alert('Failed to get contract information')
    }

    const { id, abis, code, language, version } = res.data
    const abiJson = {
      language,
      version,
      abi: abis
    }

    window.localStorage.setItem(`iost_playground_${id}.js`, code)
    window.localStorage.setItem(
      `iost_playground_${id}.js.abi`,
      JSON.stringify(abiJson, undefined, 2)
    )
    updateFileList(`${id}.js`)
    setShowDialog(false)
  }

  const handleHostChange = (
    e: React.ChangeEvent<{
      name?: string | undefined
      value: unknown
    }>
  ) => {
    const host = e.target.value as string

    if (host === 'custom') {
      return setIsCustomMode(true)
    }

    setHost(host)
    setIsCustomMode(false)
  }

  const handleCustomHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const host = e.target.value as string
    setCustomHost(host)
  }

  const hosts: Host[] = nets.map(net => {
    return {
      url: getApiUrl(net, true),
      name: getNetName(net)
    }
  })

  return (
    <div className={classes.root}>
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleTabChange}
        aria-label="Vertical tabs example"
        className={classes.tabs}
      >
        {fileList.map((fileName, index) => (
          <Tab className={classes.tab} label={fileName} {...a11yProps(index)} />
        ))}
        <ApiHostSelect
          hosts={hosts}
          handleCustomHostChange={handleCustomHostChange}
          handleHostChange={handleHostChange}
          isCustomMode={isCustomMode}
          customHost={customHost}
        />
        <Button
          className={classes.createContractButton}
          variant="contained"
          color="primary"
          onClick={handleShowModal}
        >
          Create / Import a contract
        </Button>
      </Tabs>
      {fileList.map((fileName, index) => (
        <TabPanel value={value} index={index}>
          <ContractTab fileName={fileName} />
        </TabPanel>
      ))}
      {showDialog && (
        <NewContractModal
          closeFn={handleShowModal}
          createFn={createNewContract}
          importFn={importContract}
        />
      )}
    </div>
  )
}

export default ContractTabs
