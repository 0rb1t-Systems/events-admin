<?php

namespace App\Http\Controllers\Api;

use App\Models\EventCategory;
use Illuminate\Http\Request;

class EventCategoryController extends BaseController
{
    protected $model = EventCategory::class;

    protected $searchableFields = ['name'];

    protected $sortableFields = ['id', 'name', 'created_at', 'updated_at'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [
            'name' => 'required|string|max:255|unique:event_categories,name',
        ],
        'update' => [
            'name' => 'sometimes|required|string|max:255|unique:event_categories,name',
        ],
    ];

    public function update(Request $request, $id)
    {
        $category = $this->model::find($id);
        if (! $category) {
            return $this->notFoundResponse();
        }

        $rules = $this->validationRules['update'];
        $rules['name'] = 'sometimes|required|string|max:255|unique:event_categories,name,'.$id;

        $validated = $request->validate($rules);
        $old = $category->getOriginal();
        $category->update($validated);

        $this->logActivity(
            'Event category was updated',
            $category,
            ['old' => $old, 'attributes' => $category->getAttributes()],
            'updated'
        );

        return $this->successResponse($category->fresh(), 'Category updated successfully');
    }

    public function destroy($id)
    {
        $category = $this->model::find($id);
        if (! $category) {
            return $this->notFoundResponse();
        }

        if ($category->events()->exists()) {
            return $this->forbiddenResponse(
                'Cannot delete a category that is assigned to events. Reassign those events first.'
            );
        }

        $category->delete();

        $this->logActivity(
            'Event category was deleted',
            $category,
            ['old' => $category->getOriginal()],
            'deleted'
        );

        return $this->noContentResponse('Category moved to trash');
    }
}
