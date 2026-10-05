<?php

use App\Http\Controllers\GatewayProxyController;
use Illuminate\Support\Facades\Route;

Route::any('{service}/{path?}', GatewayProxyController::class)->where('path', '.*');
