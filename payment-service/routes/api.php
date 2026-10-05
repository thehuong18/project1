<?php

use App\Http\Controllers\MoMoPaymentController;
use Illuminate\Support\Facades\Route;

Route::post('payment/momo/start', [MoMoPaymentController::class, 'start']);
Route::get('payment/momo/callback', [MoMoPaymentController::class, 'callback']);
Route::post('payment/momo/ipn', [MoMoPaymentController::class, 'ipn']);
Route::get('payments/status', [MoMoPaymentController::class, 'status']);
