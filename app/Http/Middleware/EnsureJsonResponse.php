<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureJsonResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Force JSON requests for API routes, but allow multipart/form-data for file uploads
        if ($request->is('api/*')) {
            $request->headers->set('Accept', 'application/json');

            // Only set Content-Type to application/json if there are no files
            if (empty($request->allFiles())) {
                $request->headers->set('Content-Type', 'application/json');
            }

            // Ensure the request expects JSON
            $request->server->set('HTTP_ACCEPT', 'application/json');
        }

        $response = $next($request);

        // Ensure JSON content type for API responses
        if ($request->is('api/*')) {
            $response->headers->set('Content-Type', 'application/json');
        }

        return $response;
    }
}
