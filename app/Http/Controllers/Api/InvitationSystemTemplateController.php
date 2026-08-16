<?php

namespace App\Http\Controllers\Api;

use App\Models\InvitationSystemTemplate;
use App\Support\InvitationCanvas;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Admin CRUD for platform invitation system template library.
 * Organizer designer / generation is Web App Phase 2.
 */
class InvitationSystemTemplateController extends BaseController
{
    protected $model = InvitationSystemTemplate::class;

    protected $searchableFields = ['name', 'slug'];

    protected $sortableFields = ['id', 'name', 'slug', 'active', 'created_at', 'updated_at'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request, true);

        $validated['slug'] = $validated['slug'] ?? Str::slug($validated['name']);
        $validated['default_overlay_positions'] = $validated['default_overlay_positions']
            ?? InvitationCanvas::defaultOverlayPositions();
        $validated['default_customizations'] = $validated['default_customizations']
            ?? InvitationCanvas::defaultCustomizations();
        $validated['active'] = array_key_exists('active', $validated)
            ? filter_var($validated['active'], FILTER_VALIDATE_BOOLEAN)
            : true;

        $validated = $this->storeUploadedImages($request, $validated);

        $template = InvitationSystemTemplate::create($validated);

        $this->logActivity(
            'Invitation system template was created',
            $template,
            ['attributes' => $template->getAttributes()],
            'created'
        );

        return $this->createdResponse($template, 'Template created successfully');
    }

    public function update(Request $request, $id)
    {
        $template = InvitationSystemTemplate::find($id);
        if (! $template) {
            return $this->notFoundResponse();
        }

        $validated = $this->validatePayload($request, false, (int) $id);

        if (array_key_exists('active', $validated)) {
            $validated['active'] = filter_var($validated['active'], FILTER_VALIDATE_BOOLEAN);
        }

        $validated = $this->storeUploadedImages($request, $validated, $template);

        $old = $template->getOriginal();
        $template->update($validated);

        $this->logActivity(
            'Invitation system template was updated',
            $template,
            ['old' => $old, 'attributes' => $template->getAttributes()],
            'updated'
        );

        return $this->successResponse($template->fresh(), 'Template updated successfully');
    }

    public function destroy($id)
    {
        $template = InvitationSystemTemplate::find($id);
        if (! $template) {
            return $this->notFoundResponse();
        }

        $template->delete();

        $this->logActivity(
            'Invitation system template was deleted',
            $template,
            ['old' => $template->getOriginal()],
            'deleted'
        );

        return $this->noContentResponse('Template moved to trash');
    }

    public function forceDestroy($id)
    {
        $template = InvitationSystemTemplate::withTrashed()->find($id);
        if (! $template) {
            return $this->notFoundResponse();
        }

        if ($template->isUsedByAnyEvent()) {
            return $this->forbiddenResponse(
                'Cannot permanently delete a system template that is used by one or more event invitation configs. Soft-delete (deactivate via trash) instead.'
            );
        }

        $template->forceDelete();

        $this->logActivity(
            'Invitation system template was permanently deleted',
            $template,
            ['attributes' => $template->getAttributes()],
            'force_deleted'
        );

        return $this->noContentResponse('Template permanently deleted');
    }

    public function bulkForceDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|integer',
        ]);

        $templates = InvitationSystemTemplate::withTrashed()
            ->whereIn('id', $validated['ids'])
            ->get();

        foreach ($templates as $template) {
            if ($template->isUsedByAnyEvent()) {
                return $this->forbiddenResponse(
                    'Cannot permanently delete system template "'.$template->name.'" because it is used by one or more events.'
                );
            }
        }

        return parent::bulkForceDelete($request);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request, bool $creating, ?int $id = null): array
    {
        $slugUnique = 'unique:invitation_system_templates,slug';
        if ($id) {
            $slugUnique .= ','.$id;
        }

        // Multipart forms may send JSON fields as strings
        foreach (['default_overlay_positions', 'default_customizations'] as $jsonField) {
            if ($request->has($jsonField) && is_string($request->input($jsonField))) {
                $decoded = json_decode($request->input($jsonField), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$jsonField => $decoded]);
                }
            }
        }

        $rules = [
            'name' => ($creating ? 'required' : 'sometimes|required').'|string|max:255',
            'slug' => ($creating ? 'nullable' : 'sometimes|nullable').'|string|max:255|'.$slugUnique,
            'active' => 'sometimes|boolean',
            'default_overlay_positions' => 'nullable|array',
            'default_customizations' => 'nullable|array',
            'thumbnail' => 'nullable|file|mimes:jpeg,png,jpg,webp|max:2048',
            'background_image' => ($creating ? 'required_without:background_image_path' : 'sometimes').'|nullable|file|mimes:jpeg,png,jpg,webp|max:5120',
            'background_image_path' => ($creating ? 'required_without:background_image' : 'sometimes').'|nullable|string|max:500',
            'thumbnail_path' => 'sometimes|nullable|string|max:500',
        ];

        return $request->validate($rules);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function storeUploadedImages(Request $request, array $validated, ?InvitationSystemTemplate $existing = null): array
    {
        unset($validated['thumbnail'], $validated['background_image']);

        if ($request->hasFile('background_image')) {
            $file = $request->file('background_image');
            $filename = 'bg-'.Str::uuid().'.'.$file->getClientOriginalExtension();
            $relative = 'assets/images/invitation-templates/'.$filename;
            $fullPath = public_path($relative);
            if (! is_dir(dirname($fullPath))) {
                mkdir(dirname($fullPath), 0755, true);
            }
            $file->move(dirname($fullPath), $filename);
            $validated['background_image_path'] = '/'.$relative;
        }

        if ($request->hasFile('thumbnail')) {
            $file = $request->file('thumbnail');
            $filename = 'thumb-'.Str::uuid().'.'.$file->getClientOriginalExtension();
            $relative = 'assets/images/invitation-templates/'.$filename;
            $fullPath = public_path($relative);
            if (! is_dir(dirname($fullPath))) {
                mkdir(dirname($fullPath), 0755, true);
            }
            $file->move(dirname($fullPath), $filename);
            $validated['thumbnail_path'] = '/'.$relative;
        }

        return $validated;
    }
}
