<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\Admin\ChatController;
use App\Http\Controllers\UserChatController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
Route::post('/auth/resend-otp', [AuthController::class, 'resendOtp']);
Route::post('/auth/forgot-password/send-otp', [AuthController::class, 'sendResetOtp']);
Route::post('/auth/forgot-password/verify-otp', [AuthController::class, 'verifyResetOtp']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);

Route::middleware('auth:api')->group(function () {
    Route::get('/auth/addresses', [AddressController::class, 'index']);
    Route::post('/auth/addresses', [AddressController::class, 'store']);
    Route::put('/auth/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/auth/addresses/{address}', [AddressController::class, 'destroy']);
    Route::patch('/auth/addresses/{address}/default', [AddressController::class, 'setDefault']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::get('/users', [AuthController::class, 'getUsers']);
    Route::patch('/users/{user}/status', [AuthController::class, 'updateUserStatus']);

    Route::get('/user/chat/messages', [UserChatController::class, 'index']);
    Route::post('/user/chat/send', [UserChatController::class, 'send']);

    Route::get('/admin/chat/users', [ChatController::class, 'getUsers']);
    Route::get('/admin/chat/search', [ChatController::class, 'searchCustomers']);
    Route::get('/admin/chat/unread-count', [ChatController::class, 'getUnreadCount']);
    Route::get('/admin/chat/user-detail/{userId}', [ChatController::class, 'getUserDetail']);
    Route::get('/admin/chat/messages/{userId}', [ChatController::class, 'getMessages']);
    Route::post('/admin/chat/send', [ChatController::class, 'send']);
    Route::patch('/admin/chat/messages/{userId}/read', [ChatController::class, 'markAsRead']);
});
