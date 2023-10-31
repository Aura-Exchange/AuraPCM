import { GetStaticProps, InferGetStaticPropsType, NextPage } from 'next'
import { ComponentPropsWithoutRef, useContext, useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import { useMarketplaceChain, useMounted } from 'hooks'
import { useAccount } from 'wagmi'
import { paths } from '@reservoir0x/reservoir-sdk'
import { useCollections } from '@reservoir0x/reservoir-kit-ui'
import fetcher from 'utils/fetcher'
import { NORMALIZE_ROYALTIES } from './_app'
import supportedChains from 'utils/chains'
import  {
  CollectionsSortingOption,
} from 'components/common/CollectionsTimeDropdown'
import { CollectionRankingsTable } from 'components/rankings/CollectionRankingsTable'
import { ChainContext } from 'context/ChainContextProvider'
import { useRouter } from 'next/router'

type Props = InferGetStaticPropsType<typeof getStaticProps>

const IndexPage: NextPage<Props> = ({ ssr }) => {
  const isSSR = typeof window === 'undefined'
  const isMounted = useMounted()
  const compactToggleNames = useMediaQuery({ query: '(max-width: 800px)' })
  const [sortByTime, setSortByTime] =
    useState<CollectionsSortingOption>('1DayVolume')
  const marketplaceChain = useMarketplaceChain()
  const { isDisconnected } = useAccount()
  const {push} = useRouter()

  let collectionQuery: Parameters<typeof useCollections>['0'] = {
    limit: 10,
    sortBy: sortByTime,
    includeTopBid: true,
  }

  const { chain } = useContext(ChainContext)

  if (chain.collectionSetId) {
    collectionQuery.collectionsSetId = chain.collectionSetId
  } else if (chain.community) {
    collectionQuery.community = chain.community
  }

  const { data, isValidating } = useCollections(collectionQuery, {
    fallbackData: [ssr.collections[marketplaceChain.id]],
  })

  let collections = data || []

  let volumeKey: ComponentPropsWithoutRef<
    typeof CollectionRankingsTable
  >['volumeKey'] = 'allTime'

  switch (sortByTime) {
    case '1DayVolume':
      volumeKey = '1day'
      break
    case '7DayVolume':
      volumeKey = '7day'
      break
    case '30DayVolume':
      volumeKey = '30day'
      break
  }

  useEffect(() => {
    if(!isValidating){
      push(`/collection/${chain.name}/${collections[0].id}`);
      
    }
 }, [isValidating]);


  return (
    <><p>resrt</p></>
  )
}

type CollectionSchema =
  paths['/collections/v5']['get']['responses']['200']['schema']
type ChainCollections = Record<string, CollectionSchema>

export const getStaticProps: GetStaticProps<{
  ssr: {
    collections: ChainCollections
  }
}> = async () => {
  let collectionQuery: paths['/collections/v5']['get']['parameters']['query'] =
  {
    sortBy: '1DayVolume',
    normalizeRoyalties: NORMALIZE_ROYALTIES,
    includeTopBid: true,
    limit: 10,
  }

  const promises: ReturnType<typeof fetcher>[] = []
  supportedChains.forEach((chain) => {
    const query = { ...collectionQuery }
    if (chain.collectionSetId) {
      query.collectionsSetId = chain.collectionSetId
    } else if (chain.community) {
      query.community = chain.community
    }
    promises.push(
      fetcher(`${chain.reservoirBaseUrl}/collections/v5`, query, {
        headers: {
          'x-api-key': chain.apiKey || '',
        },
      })
    )
  })
  const responses = await Promise.allSettled(promises)
  const collections: ChainCollections = {}
  responses.forEach((response, i) => {
    if (response.status === 'fulfilled') {
      collections[supportedChains[i].id] = response.value.data
    }
  })

  return {
    props: { ssr: { collections } },
    revalidate: 5,
  }
}

export default IndexPage
