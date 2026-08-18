<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Organizer Web API — event gallery for owned events only (cross-organizer → 404).
 *
 * Multipart field name is `image` (Admin uses the same field on POST /events/{id}/gallery).
 * Validation copied from EventController::uploadGalleryImage: jpeg/png/jpg/gif/webp, max 4MB.
 * Files stored under public/assets/images/events/. Delete uses EventImage::deleteFileFromDisk().
 */
class OrganizerGalleryController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventImage::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'sort_order'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function forEvent(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);

        $paginator = EventImage::query()
            ->where('event_id', $owned->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage);

        return $this->successResponse($this->webPaginatorPayload($paginator));
    }

    public function showForEvent($event, $image)
    {
        $row = $this->ownedImageOrFail($event, $image);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        return $this->successResponse($row);
    }

    /**
     * Upload a gallery image. Multipart field: `image`.
     */
    public function storeForEvent(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $request->validate([
            'image' => 'required|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $file = $request->file('image');
        $filename = 'event-'.$owned->id.'-'.date('Y-m-d-H-i-s').'-'.uniqid().'.'.$file->getClientOriginalExtension();
        $relative = 'assets/images/events/'.$filename;
        $fullPath = public_path($relative);
        if (! is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }
        $file->move(dirname($fullPath), $filename);

        $image = EventImage::create([
            'event_id' => $owned->id,
            'path' => '/'.$relative,
            'sort_order' => $request->integer('sort_order', $owned->images()->count()),
        ]);

        return $this->createdResponse($image, 'Gallery image uploaded');
    }

    public function destroyForEvent($event, $image)
    {
        $row = $this->ownedImageOrFail($event, $image);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $row->deleteFileFromDisk();
        $row->delete();

        return $this->noContentResponse('Gallery image deleted');
    }
}
