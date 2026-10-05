<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('coupon_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained('coupons')->onDelete('cascade');
            $table->unsignedBigInteger('user_id'); // Tham chiếu Auth Service
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->decimal('discount_amount', 12, 2);
            $table->timestamps();

            $table->unique(['coupon_id', 'order_id']);
            $table->index(['coupon_id', 'user_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('coupon_usages');
    }
};