import { trpc } from '@/trpc/client'

export function useBucketInfo() {
  const { data } = trpc.r2.bucketInfo.useQuery(undefined, {
    staleTime: Infinity,
  })

  return {
    bucketName: data?.bucketName,
  }
}
