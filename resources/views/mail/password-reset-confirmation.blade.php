@extends('mail.layout')

@section('title', 'Password Successfully Reset')
@section('header-color', '#10B981')
@section('header-title', 'Password Reset Successful')
@section('header-subtitle', 'Your account is now secure')
@section('button-color', '#10B981')

@section('content')
<h2>Hello {{ $user_name }},</h2>

<p>We're writing to confirm that your password for your {{ config('app.name') }} account has been successfully reset. Your account is now secure with your new password.</p>


<div style="background-color: #f8f9fa; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 6px;">
    <h3 style="margin-top: 0; color: #2c3e50;">🛡️ Security Information:</h3>
    <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Your password was reset on: <strong>{{ now()->format('F j, Y \a\t g:i A') }}</strong></li>
        <li>All previous login sessions have been terminated for security</li>
        <li>You'll need to log in again with your new password</li>
    </ul>
</div>

@if(isset($login_url))
<div style="text-align: center; margin: 30px 0;">
    <a href="{{ $login_url }}" class="btn">
        Login to Your Account
    </a>
</div>
@endif

<div class="warning">
    <strong>Security Alert:</strong> If you did not request this password reset, please contact our support team immediately as your account may have been compromised.
</div>

<p>If you have any questions, feel free to contact our support team.</p>

@endsection
