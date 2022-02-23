import Web3 from 'web3'
import {
  // console,
  getData
  //   downloadFile,
  //   downloadFileBrowser
} from '../utils'
import {
  FileMetadata,
  //   ComputeJob,
  //   ComputeOutput,
  //   ComputeAlgorithm,
  //   ComputeAsset,
  //   ComputeEnvironment,
  ProviderInitialize
} from '../@types/'
import { noZeroX } from '../utils'
import { signText, signWithHash } from '../utils'
import fetch from 'cross-fetch'

export interface HttpCallback {
  (httpMethod: string, url: string, body: string, header: any): Promise<any>
}

export interface ServiceEndpoint {
  serviceName: string
  method: string
  urlPath: string
}
export interface UserCustomParameters {
  [key: string]: any
}

export class Provider {
  /**
   * Returns the provider endpoints
   * @return {Promise<ServiceEndpoint[]>}
   */
  async getEndpoints(providerUri: string): Promise<any> {
    try {
      const endpoints = await getData(providerUri)
      return await endpoints.json()
    } catch (e) {
      console.error('Finding the service endpoints failed:', e)
      return null
    }
  }

  getEndpointURL(
    servicesEndpoints: ServiceEndpoint[],
    serviceName: string
  ): ServiceEndpoint {
    if (!servicesEndpoints) return null
    return servicesEndpoints.find(
      (s) => s.serviceName === serviceName
    ) as ServiceEndpoint
  }

  /**
   * Returns the service endpoints that exist in provider.
   * @param {any} endpoints
   * @return {Promise<ServiceEndpoint[]>}
   */
  public async getServiceEndpoints(providerEndpoint: string, endpoints: any) {
    const serviceEndpoints: ServiceEndpoint[] = []
    for (const i in endpoints.serviceEndpoints) {
      const endpoint: ServiceEndpoint = {
        serviceName: i,
        method: endpoints.serviceEndpoints[i][0],
        urlPath: providerEndpoint + endpoints.serviceEndpoints[i][1]
      }
      serviceEndpoints.push(endpoint)
    }
    return serviceEndpoints
  }

  /** Encrypt DDO using the Provider's own symmetric key
   * @param {string} providerUri provider uri address
   * @param {string} consumerAddress Publisher address
   * @param {AbortSignal} signal abort signal
   * @param {string} providerEndpoints Identifier of the asset to be registered in ocean
   * @param {string} serviceEndpoints document description object (DDO)=
   * @return {Promise<string>} urlDetails
   */
  public async getNonce(
    providerUri: string,
    consumerAddress: string,
    signal?: AbortSignal,
    providerEndpoints?: any,
    serviceEndpoints?: ServiceEndpoint[]
  ): Promise<string> {
    if (!providerEndpoints) {
      providerEndpoints = await this.getEndpoints(providerUri)
    }
    if (!serviceEndpoints) {
      serviceEndpoints = await this.getServiceEndpoints(
        providerUri,
        providerEndpoints
      )
    }
    const path = this.getEndpointURL(serviceEndpoints, 'nonce')
      ? this.getEndpointURL(serviceEndpoints, 'nonce').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetch(path + `?userAddress=${consumerAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      return String((await response.json()).nonce)
    } catch (e) {
      console.error(e)
      throw new Error('HTTP request failed')
    }
  }

  public async createSignature(
    web3: Web3,
    accountId: string,
    agreementId: string
  ): Promise<string> {
    const signature = await signText(web3, noZeroX(agreementId), accountId)
    return signature
  }

  public async createHashSignature(
    web3: Web3,
    accountId: string,
    message: string
  ): Promise<string> {
    const signature = await signWithHash(web3, message, accountId)
    return signature
  }

  /** Encrypt data using the Provider's own symmetric key
   * @param {string} data data in json format that needs to be sent , it can either be a DDO or a File array
   * @param {string} providerUri provider uri address
   * @param {AbortSignal} signal abort signal
   * @return {Promise<string>} urlDetails
   */
  public async encrypt(
    data: any,
    providerUri: string,
    signal?: AbortSignal
  ): Promise<string> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const path = this.getEndpointURL(serviceEndpoints, 'encrypt')
      ? this.getEndpointURL(serviceEndpoints, 'encrypt').urlPath
      : null

    if (!path) return null
    try {
      const response = await fetch(path, {
        method: 'POST',
        body: decodeURI(JSON.stringify(data)),
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        signal: signal
      })
      return await response.text()
    } catch (e) {
      console.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /** Get DDO File details (if possible)
   * @param {string} did did
   * @param {number} serviceId the id of the service for which to check the files
   * @param {string} providerUri uri of the provider that will be used to check the file
   * @param {AbortSignal} signal abort signal
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async checkDidFiles(
    did: string,
    serviceId: number,
    providerUri: string,
    signal?: AbortSignal
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { did: did, serviceId: serviceId }
    const files: FileMetadata[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'fileinfo')
      ? this.getEndpointURL(serviceEndpoints, 'fileinfo').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const results: FileMetadata[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      return null
    }
  }

  /** Get URL details (if possible)
   * @param {string} url or did
   * @param {string} providerUri uri of the provider that will be used to check the file
   * @param {AbortSignal} signal abort signal
   * @return {Promise<FileMetadata[]>} urlDetails
   */
  public async checkFileUrl(
    url: string,
    providerUri: string,
    signal?: AbortSignal
  ): Promise<FileMetadata[]> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const args = { url: url, type: 'url' }
    const files: FileMetadata[] = []
    const path = this.getEndpointURL(serviceEndpoints, 'fileinfo')
      ? this.getEndpointURL(serviceEndpoints, 'fileinfo').urlPath
      : null
    if (!path) return null
    try {
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const results: FileMetadata[] = await response.json()
      for (const result of results) {
        files.push(result)
      }
      return files
    } catch (e) {
      return null
    }
  }

  /** Initialize a service request.
   * @param {DDO | string} asset
   * @param {number} serviceIndex
   * @param {string} serviceType
   * @param {string} consumerAddress
   * @param {UserCustomParameters} userCustomParameters
   * @param {string} providerUri Identifier of the asset to be registered in ocean
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ProviderInitialize>} ProviderInitialize data
   */
  public async initialize(
    did: string,
    serviceId: string,
    fileIndex: number,
    consumerAddress: string,
    providerUri: string,
    signal?: AbortSignal,
    userCustomParameters?: UserCustomParameters,
    computeEnv?: string,
    validUntil?: number
  ): Promise<ProviderInitialize> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    let initializeUrl = this.getEndpointURL(serviceEndpoints, 'initialize')
      ? this.getEndpointURL(serviceEndpoints, 'initialize').urlPath
      : null

    if (!initializeUrl) return null
    initializeUrl += `?documentId=${did}`
    initializeUrl += `&serviceId=${serviceId}`
    initializeUrl += `&fileIndex=${fileIndex}`
    initializeUrl += `&consumerAddress=${consumerAddress}`
    if (userCustomParameters)
      initializeUrl +=
        '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
    if (computeEnv) initializeUrl += '&environment=' + encodeURI(computeEnv)
    if (validUntil) initializeUrl += '&validUntil=' + validUntil
    try {
      const response = await fetch(initializeUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      const results: ProviderInitialize = await response.json()
      return results
    } catch (e) {
      console.error(e)
      throw new Error('Asset URL not found or not available.')
    }
  }

  /** Gets fully signed URL for download
   * @param {string} did
   * @param {string} accountId
   * @param {string} serviceId
   * @param {number} fileIndex
   * @param {string} providerUri
   * @param {Web3} web3
   * @param {UserCustomParameters} userCustomParameters
   * @return {Promise<string>}
   */
  public async getDownloadUrl(
    did: string,
    accountId: string,
    serviceId: string,
    fileIndex: number,
    transferTxId: string,
    providerUri: string,
    web3: Web3,
    userCustomParameters?: UserCustomParameters
  ): Promise<any> {
    const providerEndpoints = await this.getEndpoints(providerUri)
    const serviceEndpoints = await this.getServiceEndpoints(
      providerUri,
      providerEndpoints
    )
    const downloadUrl = this.getEndpointURL(serviceEndpoints, 'download')
      ? this.getEndpointURL(serviceEndpoints, 'download').urlPath
      : null
    if (!downloadUrl) return null
    const nonce = Date.now()
    const signature = await this.createSignature(web3, accountId, did + nonce)

    let consumeUrl = downloadUrl
    consumeUrl += `?fileIndex=${fileIndex}`
    consumeUrl += `&documentId=${did}`
    consumeUrl += `&transferTxId=${transferTxId}`
    consumeUrl += `&serviceId=${serviceId}`
    consumeUrl += `&consumerAddress=${accountId}`
    consumeUrl += `&nonce=${nonce}`
    consumeUrl += `&signature=${signature}`
    if (userCustomParameters)
      consumeUrl +=
        '&userdata=' + encodeURI(JSON.stringify(userCustomParameters))
    return consumeUrl
  }

  /** Check for a valid provider at URL
   * @param {String} url provider uri address
   * @param {AbortSignal} signal abort signal
   * @return {Promise<boolean>} string
   */
  public async isValidProvider(
    url: string,
    signal?: AbortSignal
  ): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })
      if (response?.ok) {
        const params = await response.json()
        if (params && params.providerAddress) return true
      }
      return false
    } catch (error) {
      console.error(`Error validating provider: ${error.message}`)
      return false
    }
  }
}

export const ProviderInstance = new Provider()
export default ProviderInstance