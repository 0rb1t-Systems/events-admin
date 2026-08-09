@extends('mail.layout')

@section('title', 'Reset Your Password')
@section('header-color', '#EF4444')
@section('header-title', config('app.name'))
@section('header-subtitle', 'Password Reset Request')
@section('code-color', '#EF4444')

@section('content')
<h2>Hello {{ $user_name }},</h2>

<p>We received a request to reset your password for your {{ config('app.name') }} account.</p>

<p>Use the reset code below to reset your password:</p>

<div class="code-box">
    {{ $reset_code }}
</div>

<div class="warning">
    <strong>Important:</strong> This reset code will expire in 30 minutes for security purposes.
</div>

<p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>

<p>For security reasons, never share this code with anyone.</p>

@endsection
