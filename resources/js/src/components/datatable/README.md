# CustomDataTable Component

This is a reusable data table component for React applications, built on top of Mantine's DataTable with additional features.

## Features

- Pagination with customizable page sizes
- Sorting with persistent state
- Search functionality with debounce
- Row selection with bulk actions
- Loading and empty states
- URL state persistence for filters and pagination

## Basic Usage

```tsx
import CustomDataTable from '../components/datatable';
import { alphabeticApi } from '../services/alphabetic';
import { IconTrash, IconRestore, IconX } from '@tabler/icons-react';

const AlphabetsPage = () => {
  const handleDelete = async (ids: number[]) => {
    try {
      await alphabeticApi.bulkDelete(ids);
      // Refresh data or show notification
    } catch (error) {
      console.error('Failed to delete items', error);
    }
  };

  const handleRestore = async (ids: number[]) => {
    try {
      await alphabeticApi.bulkRestore(ids);
      // Refresh data or show notification
    } catch (error) {
      console.error('Failed to restore items', error);
    }
  };

  const handleForceDelete = async (ids: number[]) => {
    if (window.confirm('Are you sure you want to permanently delete these items? This action cannot be undone.')) {
      try {
        await alphabeticApi.bulkForceDelete(ids);
        // Refresh data or show notification
      } catch (error) {
        console.error('Failed to permanently delete items', error);
      }
    }
  };

  return (
    <CustomDataTable
      title="Alphabets"
      columns={[
        { accessor: 'id', title: 'ID', sortable: true, width: 80 },
        { accessor: 'letter', title: 'Letter', sortable: true },
        { accessor: 'type', title: 'Type', sortable: true },
        { accessor: 'created_at', title: 'Created', sortable: true },
      ]}
      fetchData={alphabeticApi.getAll}
      searchFields={['letter', 'type']}
      sortCol="id"
      rowSelectionEnabled={true}
      bulkActions={[
        {
          label: 'Delete',
          icon: <IconTrash size={14} />,
          color: 'red',
          onClick: handleDelete
        },
        {
          label: 'Restore',
          icon: <IconRestore size={14} />,
          color: 'green',
          onClick: handleRestore,
          // Only show the restore action when viewing trashed items
          isVisible: (count) => false // This would be conditionally set based on your view
        },
        {
          label: 'Permanently Delete',
          icon: <IconX size={14} />,
          color: 'red',
          variant: 'filled',
          onClick: handleForceDelete,
          // Only show force delete in trash view
          isVisible: (count) => false // This would be conditionally set based on your view
        }
      ]}
    />
  );
};
```

## Trashed Items View Example

```tsx
import { useState } from 'react';
import CustomDataTable from '../components/datatable';
import { alphabeticApi } from '../services/alphabetic';
import { IconTrash, IconRestore, IconX } from '@tabler/icons-react';
import { Button } from '@mantine/core';

const AlphabetsTrashedPage = () => {
  const [isTrashView, setIsTrashView] = useState(true);

  const handleDelete = async (ids: number[]) => {
    try {
      await alphabeticApi.bulkDelete(ids);
      // Refresh data or show notification
    } catch (error) {
      console.error('Failed to delete items', error);
    }
  };

  const handleRestore = async (ids: number[]) => {
    try {
      await alphabeticApi.bulkRestore(ids);
      // Refresh data or show notification
    } catch (error) {
      console.error('Failed to restore items', error);
    }
  };

  const handleForceDelete = async (ids: number[]) => {
    if (window.confirm('Are you sure you want to permanently delete these items? This action cannot be undone.')) {
      try {
        await alphabeticApi.bulkForceDelete(ids);
        // Refresh data or show notification
      } catch (error) {
        console.error('Failed to permanently delete items', error);
      }
    }
  };

  return (
    <CustomDataTable
      title="Trash - Alphabets"
      columns={[
        { accessor: 'id', title: 'ID', sortable: true, width: 80 },
        { accessor: 'letter', title: 'Letter', sortable: true },
        { accessor: 'type', title: 'Type', sortable: true },
        { accessor: 'deleted_at', title: 'Deleted', sortable: true },
      ]}
      fetchData={alphabeticApi.getTrashed}
      searchFields={['letter', 'type']}
      sortCol="deleted_at"
      rowSelectionEnabled={true}
      bulkActions={[
        {
          label: 'Restore',
          icon: <IconRestore size={14} />,
          color: 'green',
          onClick: handleRestore,
          isVisible: (count) => isTrashView
        },
        {
          label: 'Permanently Delete',
          icon: <IconX size={14} />,
          color: 'red',
          variant: 'filled',
          onClick: handleForceDelete,
          isVisible: (count) => isTrashView
        }
      ]}
      buttons={
        <Button 
          onClick={() => window.history.back()}
          variant="outline"
          size="sm"
        >
          Back
        </Button>
      }
    />
  );
};
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| title | string | Table title |
| columns | ColumnConfig[] | Column definitions |
| fetchData | Function | Function to fetch data |
| searchFields | string[] | Fields to search in |
| query | object | Additional query parameters |
| buttons | ReactNode | Custom buttons to display |
| sortCol | string | Default column to sort by |
| rowSelectionEnabled | boolean | Enable row selection |
| bulkActions | BulkAction[] | Actions to perform on selected rows |
| getRecordId | Function | Function to extract ID from record |

## BulkAction Interface

```typescript
interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: "filled" | "outline" | "light" | "subtle" | "default" | "white" | "gradient";
  color?: string;
  onClick: (selectedIds: number[]) => void;
  isVisible?: (count: number) => boolean;
}
``` 
