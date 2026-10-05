<?php

use App\Http\Controllers\CartController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ShippingController;
use Illuminate\Support\Facades\Route;

Route::get('orders/sales-summary', [OrderController::class, 'salesSummary']);
Route::get('orders/stats', [OrderController::class, 'stats']);
Route::get('orders', [OrderController::class, 'index']);
Route::post('orders', [OrderController::class, 'store']);
Route::get('orders/{order}', [OrderController::class, 'show']);
Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);
Route::post('orders/{order}/ghn-ship', [OrderController::class, 'createGhnShipping']);
Route::post('orders/{order}/paid', [OrderController::class, 'markPaid']);

Route::get('cart', [CartController::class, 'index']);
Route::post('cart/items', [CartController::class, 'store']);
Route::patch('cart/items/{cartItem}', [CartController::class, 'update']);
Route::delete('cart/items/{cartItem}', [CartController::class, 'destroy']);

Route::get('coupons', [CouponController::class, 'index']);
Route::post('coupons', [CouponController::class, 'store']);
Route::post('coupons/apply', [CouponController::class, 'apply']);
Route::get('coupons/{coupon}', [CouponController::class, 'show']);
Route::patch('coupons/{coupon}', [CouponController::class, 'update']);
Route::delete('coupons/{coupon}', [CouponController::class, 'destroy']);

Route::get('reviews/summary', [ReviewController::class, 'summary']);
Route::get('reviews/check', [ReviewController::class, 'check']);
Route::get('reviews', [ReviewController::class, 'index']);
Route::post('reviews', [ReviewController::class, 'store']);

Route::get('shipping/provinces', [ShippingController::class, 'provinces']);
Route::get('shipping/districts', [ShippingController::class, 'districts']);
Route::get('shipping/wards', [ShippingController::class, 'wards']);
Route::post('shipping/fee', [ShippingController::class, 'calculateFee']);
Route::post('shipping/webhook', [ShippingController::class, 'webhook']);