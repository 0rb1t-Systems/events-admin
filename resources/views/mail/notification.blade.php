@extends('mail.layout')

@section('title', $subject ?? 'Notification')
@section('header-color', '#6366F1')
@section('header-title', config('app.name'))
@section('header-subtitle', $subject ?? 'Notification')

@section('content')
<h2>Hello {{ $user_name }},</h2>

<div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366F1;">
    {!! $message !!}
</div>

@if(isset($action_url) && isset($action_text))
<div style="text-align: center;">
    <a href="{{ $action_url }}" class="btn">{{ $action_text }}</a>
</div>
@endif

<p>If you have any questions, feel free to contact our support team.</p>

@endsection
