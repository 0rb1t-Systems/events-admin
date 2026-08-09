<?php

namespace App\Http\Controllers\Api;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrganizationController extends BaseController
{
    protected $model = Organization::class;

    protected $searchableFields = ['name', 'email', 'city', 'country'];

    protected $sortableFields = ['id', 'name', 'founded_date', 'created_at', 'updated_at'];

    protected $validationRules = [
        'store' => [
            'name' => 'required|string|max:255',
            'founded_date' => 'nullable|date',
            'logo_url' => 'nullable|string|max:255',
            'website_url' => 'nullable|url|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
        ],
        'update' => [
            'name' => 'sometimes|required|string|max:255',
            'founded_date' => 'nullable|date',
            'logo_url' => 'nullable|string|max:255',
            'logo_dark_url' => 'nullable|string|max:255',
            'icon_url' => 'nullable|string|max:255',
            'website_url' => 'nullable|url|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
        ]
    ];

    /**
     * Get the current organization profile
     * Since this is a single-tenant system, we return the first organization
     */
    public function getProfile()
    {
        $organization = $this->model::first();

        if (!$organization) {
            // Return empty organization object for new setup
            $emptyOrganization = new $this->model();
            return $this->successResponse($emptyOrganization, 'No organization profile found');
        }

        // Ensure logo URLs have leading slash for proper display
        $organizationData = $organization->toArray();
        if (!empty($organizationData['logo_url']) && !str_starts_with($organizationData['logo_url'], '/')) {
            $organizationData['logo_url'] = '/' . $organizationData['logo_url'];
        }
        if (!empty($organizationData['logo_dark_url']) && !str_starts_with($organizationData['logo_dark_url'], '/')) {
            $organizationData['logo_dark_url'] = '/' . $organizationData['logo_dark_url'];
        }
        if (!empty($organizationData['icon_url']) && !str_starts_with($organizationData['icon_url'], '/')) {
            $organizationData['icon_url'] = '/' . $organizationData['icon_url'];
        }

        return $this->successResponse($organizationData, 'Organization profile retrieved successfully');
    }

    /**
     * Update or create organization profile
     * Since this is a single-tenant system, we either update existing or create new
     */
    public function updateProfile(Request $request)
    {
        $validated = $request->validate($this->validationRules['update']);

        $organization = $this->model::first();

        if ($organization) {
            // Update existing organization
            $organization->update($validated);
            $organization->refresh();
            $message = 'Organization profile updated successfully';
        } else {
            // Create new organization if none exists
            $organization = $this->model::create($validated);
            $message = 'Organization profile created successfully';
        }

        // Ensure logo URLs have leading slash for proper display
        $organizationData = $organization->toArray();
        if (!empty($organizationData['logo_url']) && !str_starts_with($organizationData['logo_url'], '/')) {
            $organizationData['logo_url'] = '/' . $organizationData['logo_url'];
        }
        if (!empty($organizationData['logo_dark_url']) && !str_starts_with($organizationData['logo_dark_url'], '/')) {
            $organizationData['logo_dark_url'] = '/' . $organizationData['logo_dark_url'];
        }
        if (!empty($organizationData['icon_url']) && !str_starts_with($organizationData['icon_url'], '/')) {
            $organizationData['icon_url'] = '/' . $organizationData['icon_url'];
        }

        return $this->successResponse($organizationData, $message);
    }

    /**
     * Upload organization logo
     */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|file|mimes:jpeg,png,jpg,gif,svg|max:2048'
        ]);

        $organization = $this->model::first();

        // If no organization exists, create one with just the logo
        if (!$organization) {
            $organization = $this->model::create([
                'name' => 'Organization', // Default name
                'logo_url' => null
            ]);
        }

        // Delete old logo if exists
        if ($organization->logo_url) {
            // Remove leading slash if present
            $oldLogoPath = ltrim($organization->logo_url, '/');
            $fullPath = public_path($oldLogoPath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }

        // Generate filename with current date
        $extension = $request->file('logo')->getClientOriginalExtension();
        $filename = 'logo-' . date('Y-m-d-H-i-s') . '.' . $extension;

        // Store logo in the specified directory
        $logoPath = 'assets/images/' . $filename;
        $fullPath = public_path($logoPath);

        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        // Move uploaded file to destination
        $request->file('logo')->move(dirname($fullPath), $filename);

        // Store with leading slash for consistency
        $organization->update(['logo_url' => '/' . $logoPath]);

        return $this->successResponse([
            'logo_url' => '/' . $logoPath
        ], 'Logo uploaded successfully');
    }

    /**
     * Remove organization logo
     */
    public function removeLogo()
    {
        $organization = $this->model::first();

        if (!$organization) {
            return $this->notFoundResponse('Organization profile not found');
        }

        if ($organization->logo_url) {
            // Delete file from the assets/images directory
            // Remove leading slash if present for public_path
            $logoPath = ltrim($organization->logo_url, '/');
            $fullPath = public_path($logoPath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
            $organization->update(['logo_url' => null]);
        }

        return $this->successResponse(null, 'Logo removed successfully');
    }

    /**
     * Upload organization dark logo
     */
    public function uploadDarkLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|file|mimes:jpeg,png,jpg,gif,svg|max:2048'
        ]);

        $organization = $this->model::first();

        if (!$organization) {
            $organization = $this->model::create([
                'name' => 'Organization',
                'logo_dark_url' => null
            ]);
        }

        if ($organization->logo_dark_url) {
            // Remove leading slash if present for public_path
            $oldLogoPath = ltrim($organization->logo_dark_url, '/');
            $fullPath = public_path($oldLogoPath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }

        $extension = $request->file('logo')->getClientOriginalExtension();
        $filename = 'logo-dark-' . date('Y-m-d-H-i-s') . '.' . $extension;
        $logoPath = 'assets/images/' . $filename;
        $fullPath = public_path($logoPath);

        $directory = dirname($fullPath);
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        $request->file('logo')->move(dirname($fullPath), $filename);
        // Store with leading slash for consistency
        $organization->update(['logo_dark_url' => '/' . $logoPath]);

        return $this->successResponse([
            'logo_dark_url' => '/' . $logoPath
        ], 'Dark logo uploaded successfully');
    }

    /**
     * Remove organization dark logo
     */
    public function removeDarkLogo()
    {
        $organization = $this->model::first();

        if (!$organization) {
            return $this->notFoundResponse('Organization profile not found');
        }

        if ($organization->logo_dark_url) {
            // Remove leading slash if present for public_path
            $logoPath = ltrim($organization->logo_dark_url, '/');
            $fullPath = public_path($logoPath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
            $organization->update(['logo_dark_url' => null]);
        }

        return $this->successResponse(null, 'Dark logo removed successfully');
    }

    /**
     * Upload organization favicon/icon
     */
    public function uploadIcon(Request $request)
    {
        $request->validate([
            'icon' => 'required|file|mimes:jpeg,png,jpg,gif,svg,ico|max:2048'
        ]);

        $organization = $this->model::first();

        if (!$organization) {
            $organization = $this->model::create([
                'name' => 'Organization',
                'icon_url' => null
            ]);
        }

        if ($organization->icon_url) {
            // Remove leading slash if present for public_path
            $oldIconPath = ltrim($organization->icon_url, '/');
            $fullPath = public_path($oldIconPath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }

        $extension = $request->file('icon')->getClientOriginalExtension();
        $filename = 'icon-' . date('Y-m-d-H-i-s') . '.' . $extension;
        $iconPath = 'assets/images/' . $filename;
        $fullPath = public_path($iconPath);

        $directory = dirname($fullPath);
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        $request->file('icon')->move(dirname($fullPath), $filename);
        // Store with leading slash for consistency
        $organization->update(['icon_url' => '/' . $iconPath]);

        return $this->successResponse([
            'icon_url' => '/' . $iconPath
        ], 'Favicon uploaded successfully');
    }

    /**
     * Remove organization favicon/icon
     */
    public function removeIcon()
    {
        $organization = $this->model::first();

        if (!$organization) {
            return $this->notFoundResponse('Organization profile not found');
        }

        if ($organization->icon_url) {
            // Remove leading slash if present for public_path
            $iconPath = ltrim($organization->icon_url, '/');
            $fullPath = public_path($iconPath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
            $organization->update(['icon_url' => null]);
        }

        return $this->successResponse(null, 'Favicon removed successfully');
    }

    /**
     * Override index method to return single organization
     */
    public function index(Request $request)
    {
        return $this->getProfile();
    }

    /**
     * Override store method to use updateProfile logic
     */
    public function store(Request $request)
    {
        return $this->updateProfile($request);
    }

    /**
     * Override show method to return single organization
     */
    public function show($id)
    {
        return $this->getProfile();
    }

    /**
     * Override update method to use updateProfile logic
     */
    public function update(Request $request, $id)
    {
        return $this->updateProfile($request);
    }

    /**
     * Override destroy method - prevent deletion in single-tenant system
     */
    public function destroy($id)
    {
        return $this->forbiddenResponse('Organization profile cannot be deleted in single-tenant system');
    }

    /**
     * Override bulk operations - not applicable for single organization
     */
    public function bulkDelete(Request $request)
    {
        return $this->forbiddenResponse('Bulk operations not applicable for single organization');
    }

    public function bulkRestore(Request $request)
    {
        return $this->forbiddenResponse('Bulk operations not applicable for single organization');
    }

    public function bulkForceDelete(Request $request)
    {
        return $this->forbiddenResponse('Bulk operations not applicable for single organization');
    }
}
