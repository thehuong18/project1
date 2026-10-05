<?php

use App\Http\Controllers\CatalogController;
use Illuminate\Support\Facades\Route;

Route::get('products', [CatalogController::class, 'products']);
Route::post('products/check-stock', [CatalogController::class, 'checkStock']);
Route::get('categories', [CatalogController::class, 'categories']);
Route::get('brands', [CatalogController::class, 'brands']);
Route::get('banners', [CatalogController::class, 'banners']);