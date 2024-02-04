import { useApolloClient } from '@apollo/client';

import { triggerDeleteRecordsOptimisticEffect } from '@/apollo/optimistic-effect/utils/triggerDeleteRecordsOptimisticEffect';
import { useGetRelationMetadata } from '@/object-metadata/hooks/useGetRelationMetadata';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { getDeleteManyRecordsMutationResponseField } from '@/object-record/hooks/useGenerateDeleteManyRecordMutation';
import { isDefined } from '~/utils/isDefined';
import { capitalize } from '~/utils/string/capitalize';

type useDeleteOneRecordProps = {
  objectNameSingular: string;
  refetchFindManyQuery?: boolean;
};

export const useDeleteManyRecords = ({
  objectNameSingular,
}: useDeleteOneRecordProps) => {
  const apolloClient = useApolloClient();

  const { objectMetadataItem, deleteManyRecordsMutation, getRecordFromCache } =
    useObjectMetadataItem({ objectNameSingular });

  const getRelationMetadata = useGetRelationMetadata();

  const mutationResponseField = getDeleteManyRecordsMutationResponseField(
    objectMetadataItem.namePlural,
  );

  const deleteManyRecords = async (idsToDelete: string[]) => {
    const deletedRecords = await apolloClient.mutate({
      mutation: deleteManyRecordsMutation,
      variables: {
        filter: { id: { in: idsToDelete } },
      },
      optimisticResponse: {
        [mutationResponseField]: idsToDelete.map((idToDelete) => ({
          __typename: capitalize(objectNameSingular),
          id: idToDelete,
        })),
      },
      update: (cache, { data }) => {
        const records = data?.[mutationResponseField];

        if (!records?.length) return;

        const cachedRecords = records
          .map((record) => getRecordFromCache(record.id, cache))
          .filter(isDefined);

        triggerDeleteRecordsOptimisticEffect({
          cache,
          objectMetadataItem,
          records: cachedRecords,
          getRelationMetadata,
        });
      },
    });

    return deletedRecords.data?.[mutationResponseField] ?? null;
  };

  return { deleteManyRecords };
};
