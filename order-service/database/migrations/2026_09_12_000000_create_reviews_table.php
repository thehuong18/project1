<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 100)->index();            // order_code từ orders table
            $table->unsignedBigInteger('product_id')->index();   // Tham chiếu Catalog Service
            $table->unsignedBigInteger('user_id')->index();      // Tham chiếu Auth Service
            $table->string('user_name', 100);
            $table->string('user_avatar', 500)->nullable();
            $table->unsignedTinyInteger('rating');               // 1–5
            $table->text('comment');
            $table->timestamps();

            // Mỗi user chỉ được review 1 sản phẩm trong 1 đơn hàng
            $table->unique(['order_id', 'product_id', 'user_id'], 'unique_review_per_order_product_user');

            // Constraint: rating trong khoảng 1–5
            // (Laravel không hỗ trợ check constraint native, dùng validation thay thế)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
