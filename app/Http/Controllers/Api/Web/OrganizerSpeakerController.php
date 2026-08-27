<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Event;
use App\Models\EventSpeaker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * Organizer Web API — speakers for owned events only (cross-organizer → 404).
 * Photo: multipart field `photo` on create, or POST /organizer/speakers/{id}/photo.
 * Stored under public/assets/images/events/speakers/ (same mime/size rules as cover/gallery).
 */
class OrganizerSpeakerController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventSpeaker::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'sort_order', 'name'];

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

        $paginator = EventSpeaker::query()
            ->where('event_id', $owned->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage);

        return $this->successResponse($this->webPaginatorPayload($paginator));
    }

    public function storeForEvent(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'photo_path' => 'nullable|string|max:500',
            'title' => 'nullable|string|max:255',
            'organization' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:5000',
            'social_links' => 'nullable|array',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        unset($validated['photo']);
        $validated['event_id'] = $owned->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        if ($request->hasFile('photo')) {
            $validated['photo_path'] = $this->storeSpeakerPhoto($request->file('photo'), $owned);
        }

        $speaker = EventSpeaker::create($validated);

        $this->logActivity('Event speaker added', $speaker, ['event_id' => $owned->id], 'created');

        return $this->createdResponse($speaker);
    }

    /**
     * Multipart field: `photo`. jpeg/png/jpg/gif/webp, max 4096 KB.
     */
    public function uploadPhoto(Request $request, $speaker): JsonResponse
    {
        $row = $this->ownedSpeakerOrFail($speaker);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $request->validate([
            'photo' => 'required|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $event = $row->event;
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $row->photo_path = $this->storeSpeakerPhoto($request->file('photo'), $event, $row->photo_path);
        $row->save();

        $this->logActivity('Event speaker photo uploaded', $row, [], 'updated');

        return $this->successResponse($row->fresh(), 'Speaker photo uploaded');
    }

    public function update(Request $request, $speaker)
    {
        $row = $this->ownedSpeakerOrFail($speaker);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'photo_path' => 'nullable|string|max:500',
            'title' => 'nullable|string|max:255',
            'organization' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:5000',
            'social_links' => 'nullable|array',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        if (array_key_exists('photo_path', $validated) && $validated['photo_path'] !== $row->photo_path) {
            $this->deleteLocalSpeakerPhoto($row->photo_path);
        }

        $row->update($validated);

        $this->logActivity('Event speaker updated', $row, [], 'updated');

        return $this->successResponse($row->fresh(), 'Speaker updated');
    }

    public function destroy($speaker)
    {
        $row = $this->ownedSpeakerOrFail($speaker);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $this->deleteLocalSpeakerPhoto($row->photo_path);
        $row->delete();

        $this->logActivity('Event speaker deleted', $row, [], 'deleted');

        return $this->noContentResponse('Speaker deleted');
    }

    private function storeSpeakerPhoto(UploadedFile $file, Event $event, ?string $oldPath = null): string
    {
        $filename = 'speaker-'.$event->id.'-'.date('Y-m-d-H-i-s').'-'.uniqid().'.'.$file->getClientOriginalExtension();
        $relative = 'assets/images/events/speakers/'.$filename;
        $fullPath = public_path($relative);
        if (! is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }
        $file->move(dirname($fullPath), $filename);

        $this->deleteLocalSpeakerPhoto($oldPath);

        return '/'.$relative;
    }

    private function deleteLocalSpeakerPhoto(?string $path): void
    {
        if (! $path || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        $normalized = str_replace('\\', '/', public_path(ltrim($path, '/')));
        $full = public_path(ltrim($path, '/'));
        if (is_file($full) && str_contains($normalized, '/assets/images/events/speakers/')) {
            unlink($full);
        }
    }
}
