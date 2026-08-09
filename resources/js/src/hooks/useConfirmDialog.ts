import Swal, { SweetAlertOptions, SweetAlertIcon } from 'sweetalert2';
import { useCallback } from 'react';

interface UseConfirmDialogOptions {
  title?: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: SweetAlertIcon;
  customClass?: Record<string, string>;
  [key: string]: any;
}

export const useConfirmDialog = (defaultOptions?: UseConfirmDialogOptions) => {
  const confirmDelete = useCallback(
    async (options?: UseConfirmDialogOptions) => {
      const mergedOptions: SweetAlertOptions = {
        icon: 'warning' as SweetAlertIcon,
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        padding: '2em',
        customClass: {
          container: 'sweet-alerts',
          confirmButton: 'btn btn-danger',
          cancelButton: 'btn btn-outline-dark',
          title: 'text-danger',
        },
        ...defaultOptions,
        ...options,
      };

      const result = await Swal.fire(mergedOptions);
      return result.isConfirmed;
    },
    [defaultOptions]
  );

  const confirmAction = useCallback(
    async (options?: UseConfirmDialogOptions) => {
      const mergedOptions: SweetAlertOptions = {
        icon: 'question' as SweetAlertIcon,
        title: 'Confirm Action',
        text: 'Are you sure you want to proceed?',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        padding: '2em',
        customClass: {
          container: 'sweet-alerts',
          confirmButton: 'btn btn-primary',
          cancelButton: 'btn btn-outline-dark',
        },
        ...defaultOptions,
        ...options,
      };

      const result = await Swal.fire(mergedOptions);
      return result.isConfirmed;
    },
    [defaultOptions]
  );

  return {
    confirmDelete,
    confirmAction,
  };
};
