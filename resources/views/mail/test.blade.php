@extends('mail.layout')

@section('title', 'SMTP Configuration Test')
@section('header-color', '#059669')
@section('header-title', config('app.name'))
@section('header-subtitle', 'SMTP Test Email')

@section('content')
<h2>SMTP Configuration Test</h2>

<div class="success">
    <strong>Congratulations!</strong> Your SMTP configuration is working correctly.
</div>

<p>This is a test email to verify that your SMTP settings are properly configured and emails can be sent successfully from your {{ config('app.name') }} application.</p>

<p><strong>Test Details:</strong></p>
<ul>
    <li>Sent at: {{ now()->format('Y-m-d H:i:s T') }}</li>
    <li>Application: {{ config('app.name') }}</li>
    <li>Environment: {{ config('app.env') }}</li>
</ul>

<p>If you received this email, your mail configuration is working properly and you can start sending emails to your users.</p>

@endsection
