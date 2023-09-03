import { useRef } from "react";
import {
  type UseDisclosureReturn,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
} from "@chakra-ui/react";
import { api } from "~/utils/api";

import { useHandledAsyncCallback } from "~/utils/hooks";

const DeleteDatasetDialog = ({
  datasetId,
  onDelete,
  disclosure,
}: {
  datasetId?: string;
  onDelete?: () => void;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.datasets.delete.useMutation();
  const utils = api.useContext();

  const [onDeleteConfirm] = useHandledAsyncCallback(async () => {
    if (!datasetId) return;
    await mutation.mutateAsync({ id: datasetId });
    await utils.datasets.list.invalidate();
    onDelete?.();

    disclosure.onClose();
  }, [mutation, datasetId, disclosure.onClose]);

  console.log("dataset id", datasetId);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Dataset
          </AlertDialogHeader>

          <AlertDialogBody>
            If you delete this dataset all the associated dataset entries will be deleted as well.
            Are you sure?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onDeleteConfirm} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteDatasetDialog;