<?php

namespace App\Services;

use Illuminate\Support\Str;

class CommonServices
{
    /**
     * Generate a unique slug from the given name
     *
     * @param string $name The name to convert to slug
     * @param string|null $model The model class to check uniqueness against (optional)
     * @param string $column The column name to check for uniqueness (default: 'slug')
     * @param int|null $ignoreId ID to ignore when checking uniqueness (for updates)
     * @return string
     */
    public static function generateSlug(string $name, ?string $model = null, string $column = 'slug', ?int $ignoreId = null): string
    {
        $slug = Str::slug($name);

        // If no model is provided, return the basic slug
        if (!$model || !class_exists($model)) {
            return $slug;
        }

        $originalSlug = $slug;
        $counter = 1;

        // Check if slug already exists and make it unique
        while (true) {
            $query = $model::where($column, $slug);

            // Ignore specific ID if provided (useful for updates)
            if ($ignoreId) {
                $query->where('id', '!=', $ignoreId);
            }

            if (!$query->exists()) {
                break;
            }

            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Generate a simple slug without uniqueness check
     *
     * @param string $name The name to convert to slug
     * @return string
     */
    public static function makeSlug(string $name): string
    {
        return Str::slug($name);
    }
}
